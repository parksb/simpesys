local passed = 0
local failed = 0

local function test(name, fn)
  local ok, err = pcall(fn)
  if ok then
    passed = passed + 1
    print("  PASS: " .. name)
  else
    failed = failed + 1
    print("  FAIL: " .. name .. " - " .. tostring(err))
  end
end

print("test_config:")

test("get_cmd returns default without setup", function()
  -- Reset module to clear any prior setup
  package.loaded["simpesys"] = nil
  local s = require("simpesys")
  local cmd = s.get_cmd()
  assert(type(cmd) == "table", "expected table, got " .. type(cmd))
  assert(cmd[1] == "deno", "expected 'deno', got " .. tostring(cmd[1]))
  assert(cmd[#cmd] == "--stdio", "expected '--stdio' as last arg, got " .. tostring(cmd[#cmd]))
end)

test("setup with server_cmd overrides get_cmd", function()
  package.loaded["simpesys"] = nil
  local s = require("simpesys")
  s.setup({ server_cmd = { "custom-cmd", "--flag" } })
  local cmd = s.get_cmd()
  assert(cmd[1] == "custom-cmd", "expected 'custom-cmd', got " .. tostring(cmd[1]))
  assert(cmd[2] == "--flag", "expected '--flag', got " .. tostring(cmd[2]))
end)

test("plugin registers vim.lsp.config for simpesys", function()
  package.loaded["simpesys"] = nil
  vim.g.loaded_simpesys = nil
  dofile(vim.fn.fnamemodify(debug.getinfo(1).source:sub(2), ":p:h:h") .. "/plugin/simpesys.lua")

  local lsp_config = vim.lsp.config["simpesys"]
  assert(lsp_config ~= nil, "vim.lsp.config['simpesys'] should exist")
end)

test("lsp config has markdown filetype", function()
  local lsp_config = vim.lsp.config["simpesys"]
  assert(lsp_config ~= nil, "vim.lsp.config['simpesys'] should exist")

  local has_markdown = false
  for _, ft in ipairs(lsp_config.filetypes or {}) do
    if ft == "markdown" then
      has_markdown = true
    end
  end
  assert(has_markdown, "filetypes should include 'markdown'")
end)

test("lsp config has cmd set", function()
  local lsp_config = vim.lsp.config["simpesys"]
  assert(lsp_config ~= nil, "vim.lsp.config['simpesys'] should exist")
  assert(lsp_config.cmd ~= nil, "cmd should be set")
  assert(type(lsp_config.cmd) == "table", "cmd should be a table")
end)

print(string.format("\n  %d passed, %d failed", passed, failed))
