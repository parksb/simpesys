import { createConnection, ProposedFeatures } from "vscode-languageserver/node";
import { createServer } from "./server.ts";

const connection = createConnection(ProposedFeatures.all);
createServer(connection);
connection.listen();
