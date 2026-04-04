import DatabaseService from "./src/db"
import ServerService from "./src/server"

import dotenv from "dotenv"
dotenv.config()

// new ListenForFileChanges("public/ts/paint.ts")

export const db = new DatabaseService("drawings.db")
new ServerService()