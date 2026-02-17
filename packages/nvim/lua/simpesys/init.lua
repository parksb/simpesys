local M = {}

local defaults = {
  server_cmd = nil,
  keymaps = {
    backlinks = "<leader>sb",
    tree = "<leader>st",
    create_document = "<leader>sn",
  },
}

local config = vim.deepcopy(defaults)

function M.setup(opts)
  config = vim.tbl_deep_extend("force", defaults, opts or {})
end

function M.get_cmd()
  if config.server_cmd then
    return config.server_cmd
  end
  return { "deno", "run", "--allow-env", "--allow-read", "--allow-write", "jsr:@simpesys/lsp", "--stdio" }
end

function M.find_root(filepath)
  local dir = vim.fn.fnamemodify(filepath, ":p:h")

  while dir ~= "/" do
    if vim.fn.filereadable(dir .. "/simpesys.metadata.json") == 1 then
      return dir
    end

    if vim.fn.filereadable(dir .. "/deno.json") == 1 then
      local f = io.open(dir .. "/deno.json", "r")
      if f then
        local content = f:read("*a")
        f:close()
        if content:find("@simpesys/core") then
          return dir
        end
      end
    end

    dir = vim.fn.fnamemodify(dir, ":h")
  end

  return nil
end

function M.on_attach(bufnr)
  local km = config.keymaps
  local opts = { buffer = bufnr, silent = true }

  vim.keymap.set("n", km.backlinks, function()
    require("simpesys.panels").show_backlinks()
  end, opts)

  vim.keymap.set("n", km.tree, function()
    require("simpesys.panels").show_tree()
  end, opts)

  vim.keymap.set("n", km.create_document, function()
    local params = vim.lsp.util.make_position_params()
    local create_params = {
      uri = params.textDocument.uri,
      position = params.position,
    }
    vim.lsp.buf_request(0, "simpesys/createDocument", create_params, function(err, result)
      if err then
        vim.notify("[simpesys] " .. tostring(err), vim.log.levels.ERROR)
        return
      end
      if result and result.created then
        vim.cmd("edit " .. vim.fn.fnameescape(result.path))
      end
    end)
  end, opts)

  vim.api.nvim_buf_create_user_command(bufnr, "SimpesysBacklinks", function()
    require("simpesys.panels").show_backlinks()
  end, {})

  vim.api.nvim_buf_create_user_command(bufnr, "SimpesysTree", function()
    require("simpesys.panels").show_tree()
  end, {})

  vim.api.nvim_buf_create_user_command(bufnr, "SimpesysCreateDocument", function()
    local params = vim.lsp.util.make_position_params()
    local create_params = {
      uri = params.textDocument.uri,
      position = params.position,
    }
    vim.lsp.buf_request(0, "simpesys/createDocument", create_params, function(err, result)
      if err then
        vim.notify("[simpesys] " .. tostring(err), vim.log.levels.ERROR)
        return
      end
      if result and result.created then
        vim.cmd("edit " .. vim.fn.fnameescape(result.path))
      end
    end)
  end, {})
end

return M
