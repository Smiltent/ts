
import ListenForFileChanges from "./util/listenForFileChanges"
import ServerService from "./src/server"
import DatabaseService from "./src/db"

new ServerService()
new ListenForFileChanges("public/ts/paint.ts")

export const db = new DatabaseService("drawings.db")
