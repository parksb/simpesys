if vim.g.loaded_simpesys then
  return
end
vim.g.loaded_simpesys = true

local simpesys = require("simpesys")

vim.lsp.config("simpesys", {
  cmd = simpesys.get_cmd(),
  filetypes = { "markdown" },
  root_dir = function(bufnr, callback)
    local filepath = vim.api.nvim_buf_get_name(bufnr)
    local root = simpesys.find_root(filepath)
    if root then
      callback(root)
    end
  end,
})

vim.lsp.enable("simpesys")

vim.api.nvim_create_autocmd("LspAttach", {
  callback = function(args)
    local client = vim.lsp.get_client_by_id(args.data.client_id)
    if not client or client.name ~= "simpesys" then
      return
    end
    simpesys.on_attach(args.buf)
  end,
})
