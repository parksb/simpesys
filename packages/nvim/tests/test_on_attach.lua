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

local function has_buf_command(bufnr, cmd_name)
  local cmds = vim.api.nvim_buf_get_commands(bufnr, {})
  return cmds[cmd_name] ~= nil
end

local function has_buf_keymap(bufnr, mode, lhs)
  local maps = vim.api.nvim_buf_get_keymap(bufnr, mode)
  for _, map in ipairs(maps) do
    if map.lhs == lhs then
      return true
    end
  end
  return false
end

print("test_on_attach:")

test("on_attach registers SimpesysBacklinks command", function()
  package.loaded["simpesys"] = nil
  local s = require("simpesys")
  local buf = vim.api.nvim_create_buf(false, true)
  s.on_attach(buf)
  assert(has_buf_command(buf, "SimpesysBacklinks"), "SimpesysBacklinks command should be registered")
  vim.api.nvim_buf_delete(buf, { force = true })
end)

test("on_attach registers SimpesysTree command", function()
  package.loaded["simpesys"] = nil
  local s = require("simpesys")
  local buf = vim.api.nvim_create_buf(false, true)
  s.on_attach(buf)
  assert(has_buf_command(buf, "SimpesysTree"), "SimpesysTree command should be registered")
  vim.api.nvim_buf_delete(buf, { force = true })
end)

test("on_attach registers SimpesysCreateDocument command", function()
  package.loaded["simpesys"] = nil
  local s = require("simpesys")
  local buf = vim.api.nvim_create_buf(false, true)
  s.on_attach(buf)
  assert(has_buf_command(buf, "SimpesysCreateDocument"), "SimpesysCreateDocument command should be registered")
  vim.api.nvim_buf_delete(buf, { force = true })
end)

test("on_attach does NOT register gd buffer keymap", function()
  package.loaded["simpesys"] = nil
  local s = require("simpesys")
  local buf = vim.api.nvim_create_buf(false, true)
  s.on_attach(buf)
  assert(not has_buf_keymap(buf, "n", "gd"), "gd should NOT be registered as buffer-local keymap")
  vim.api.nvim_buf_delete(buf, { force = true })
end)

test("on_attach does NOT register gr buffer keymap", function()
  package.loaded["simpesys"] = nil
  local s = require("simpesys")
  local buf = vim.api.nvim_create_buf(false, true)
  s.on_attach(buf)
  assert(not has_buf_keymap(buf, "n", "gr"), "gr should NOT be registered as buffer-local keymap")
  vim.api.nvim_buf_delete(buf, { force = true })
end)

test("on_attach does NOT register K buffer keymap", function()
  package.loaded["simpesys"] = nil
  local s = require("simpesys")
  local buf = vim.api.nvim_create_buf(false, true)
  s.on_attach(buf)
  assert(not has_buf_keymap(buf, "n", "K"), "K should NOT be registered as buffer-local keymap")
  vim.api.nvim_buf_delete(buf, { force = true })
end)

test("setup with custom keymaps reflects in on_attach", function()
  package.loaded["simpesys"] = nil
  local s = require("simpesys")
  s.setup({ keymaps = { backlinks = "<leader>xb" } })
  local buf = vim.api.nvim_create_buf(false, true)
  s.on_attach(buf)
  local leader = vim.g.mapleader or "\\"
  assert(has_buf_keymap(buf, "n", leader .. "xb"), "custom backlinks keymap <leader>xb should be registered")
  assert(not has_buf_keymap(buf, "n", leader .. "sb"), "default backlinks keymap should NOT be registered")
  vim.api.nvim_buf_delete(buf, { force = true })
end)

print(string.format("\n  %d passed, %d failed", passed, failed))
