
import DatabaseService from "./src/db"
import ServerService from "./src/server"

import dotenv from "dotenv"
dotenv.config()

export const db = new DatabaseService({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
})

new ServerService()