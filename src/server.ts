
import rootRoutes from "./routes/root.routes"
import compression from "compression"
import express from "express"

export default class ServerService {
    private app: express.Application

    constructor() {
        this.app = express()

        this.app.set("view engine", "ejs")
        this.app.use("/public", express.static("public"))

        this.app.use("/d/save", express.raw({ type: "application/octet-stream", limit: "50mb" }))

        this.app.use(express.json())
        this.app.use(compression())
        this.app.use(express.urlencoded({ extended: true }))

        this.app.use("/", rootRoutes)

        this.app.listen(3000, () => {
            console.log("Server running on http://0.0.0.0:3000")
        })
    }
}
