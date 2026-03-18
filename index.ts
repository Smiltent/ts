import DatabaseService from "./src/db"
import ServerService from "./src/server"
import ListenForFileChanges from "./util/listenForFileChanges"

import dotenv from "dotenv"
dotenv.config()

new ListenForFileChanges("public/ts/paint.ts")

export const db = new DatabaseService("drawings.db")
new ServerService()