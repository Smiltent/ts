import DatabaseService from "./src/db"
import ServerService from "./src/server"
import ListenForFileChanges from "./src/util/listenForFileChanges"

// new ListenForFileChanges("public/ts/paint.ts")

export const db = new DatabaseService("drawings.db")
new ServerService()