-- Add plugin to rtp (relative to project root)
local plugin_path = vim.fn.fnamemodify(debug.getinfo(1).source:sub(2), ":p:h:h")
vim.opt.rtp:prepend(plugin_path)
