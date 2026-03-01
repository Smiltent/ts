import DatabaseService from "./src/db"
import ServerService from "./src/server"

export const db = new DatabaseService("drawings.db")
new ServerService()