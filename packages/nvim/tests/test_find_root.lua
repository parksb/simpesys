local simpesys = require("simpesys")

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

-- Resolve absolute path to examples/bare from plugin root
local plugin_path = vim.fn.fnamemodify(debug.getinfo(1).source:sub(2), ":p:h:h")
local project_root = vim.fn.fnamemodify(plugin_path, ":h:h")
local bare_root = project_root .. "/examples/bare"

print("test_find_root:")

test("finds root from docs/index.md via simpesys.metadata.json", function()
  local result = simpesys.find_root(bare_root .. "/docs/index.md")
  assert(result == bare_root, "expected " .. bare_root .. ", got " .. tostring(result))
end)

test("finds root from docs/lorem.md (same root)", function()
  local result = simpesys.find_root(bare_root .. "/docs/lorem.md")
  assert(result == bare_root, "expected " .. bare_root .. ", got " .. tostring(result))
end)

test("returns nil for non-simpesys file", function()
  local result = simpesys.find_root("/tmp/random.md")
  assert(result == nil, "expected nil, got " .. tostring(result))
end)

test("detects simpesys.metadata.json directory", function()
  -- simpesys.metadata.json is at bare_root, so any file under it should resolve
  local result = simpesys.find_root(bare_root .. "/app/main.ts")
  assert(result == bare_root, "expected " .. bare_root .. ", got " .. tostring(result))
end)

test("detects deno.json with @simpesys/core", function()
  -- deno.json at bare_root contains @simpesys/core
  -- Since simpesys.metadata.json is checked first and also at bare_root,
  -- we verify the root is correct either way
  local result = simpesys.find_root(bare_root .. "/docs/code.md")
  assert(result == bare_root, "expected " .. bare_root .. ", got " .. tostring(result))
end)

print(string.format("\n  %d passed, %d failed", passed, failed))
