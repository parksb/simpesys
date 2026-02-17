local M = {}

local function create_panel(title, lines, file_map)
  local buf = vim.api.nvim_create_buf(false, true)
  vim.api.nvim_buf_set_lines(buf, 0, -1, false, lines)
  vim.api.nvim_set_option_value("modifiable", false, { buf = buf })
  vim.api.nvim_set_option_value("buftype", "nofile", { buf = buf })
  vim.api.nvim_set_option_value("filetype", "simpesys", { buf = buf })

  vim.cmd("vsplit")
  local win = vim.api.nvim_get_current_win()
  vim.api.nvim_win_set_buf(win, buf)
  vim.api.nvim_win_set_width(win, 40)
  vim.api.nvim_buf_set_name(buf, title)

  -- q to close
  vim.keymap.set("n", "q", function()
    vim.api.nvim_win_close(win, true)
  end, { buffer = buf, silent = true })

  -- <CR> to jump
  if file_map then
    vim.keymap.set("n", "<CR>", function()
      local row = vim.api.nvim_win_get_cursor(win)[1]
      local entry = file_map[row]
      if entry then
        vim.api.nvim_win_close(win, true)
        vim.cmd("edit " .. vim.fn.fnameescape(entry.path))
        if entry.line then
          vim.api.nvim_win_set_cursor(0, { entry.line + 1, entry.col or 0 })
        end
      end
    end, { buffer = buf, silent = true })
  end
end

function M.show_backlinks()
  local params = { uri = vim.uri_from_bufnr(0) }

  vim.lsp.buf_request(0, "simpesys/backlinks", params, function(err, result)
    if err or not result or not result.backlinks then
      vim.notify("[simpesys] Failed to get backlinks", vim.log.levels.WARN)
      return
    end

    if #result.backlinks == 0 then
      vim.notify("[simpesys] No backlinks found", vim.log.levels.INFO)
      return
    end

    local lines = { "Backlinks", "" }
    local file_map = {}

    for _, bl in ipairs(result.backlinks) do
      local header = bl.sourceTitle .. " (" .. bl.sourceKey .. ")"
      table.insert(lines, header)
      file_map[#lines] = { path = bl.sourcePath, line = bl.line, col = bl.col }

      local ctx = "  " .. vim.trim(bl.context)
      table.insert(lines, ctx)
      file_map[#lines] = { path = bl.sourcePath, line = bl.line, col = bl.col }

      table.insert(lines, "")
    end

    vim.schedule(function()
      create_panel("Simpesys Backlinks", lines, file_map)
    end)
  end)
end

function M.show_tree()
  local params = {}

  vim.lsp.buf_request(0, "simpesys/documentTree", params, function(err, result)
    if err or not result then
      vim.notify("[simpesys] Failed to get document tree", vim.log.levels.WARN)
      return
    end

    local lines = { "Document Tree", "" }
    local file_map = {}

    local function render_node(node, depth)
      local indent = string.rep("  ", depth)
      local prefix = depth > 0 and "- " or ""
      local line = indent .. prefix .. node.title .. " [" .. node.key .. "]"
      table.insert(lines, line)

      local doc_path = nil
      -- Try to find doc path from key
      -- The LSP returns key, we construct path for navigation
      local bufnr = vim.api.nvim_get_current_buf()
      local clients = vim.lsp.get_clients({ bufnr = bufnr, name = "simpesys" })
      if #clients > 0 then
        local root = clients[1].config.root_dir or ""
        doc_path = root .. "/docs/" .. node.key .. ".md"
      end

      if doc_path then
        file_map[#lines] = { path = doc_path }
      end

      for _, child in ipairs(node.children or {}) do
        render_node(child, depth + 1)
      end
    end

    render_node(result, 0)

    vim.schedule(function()
      create_panel("Simpesys Tree", lines, file_map)
    end)
  end)
end

return M
