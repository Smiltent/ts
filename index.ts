
import DatabaseService from "./src/db"
import ServerService from "./src/server"

import dotenv from "dotenv"
dotenv.config()

export const db = new DatabaseService("drawings.db")
new ServerService()