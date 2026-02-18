local M = {}

local defaults = {
  server_cmd = nil,
}

local config = vim.deepcopy(defaults)

function M.setup(opts)
  config = vim.tbl_deep_extend("force", defaults, opts or {})
  if config.server_cmd then
    vim.lsp.config("simpesys", { cmd = config.server_cmd })
  end
  vim.lsp.enable("simpesys")
end

function M.get_cmd()
  if config.server_cmd then
    return config.server_cmd
  end
  return { "deno", "run", "--allow-env", "--allow-read", "--allow-write", "--allow-run", "jsr:@simpesys/lsp", "--stdio" }
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
  vim.lsp.inlay_hint.enable(true, { bufnr = bufnr })
end

return M
