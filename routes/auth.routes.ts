
import express, { Router } from "express"
import { db } from ".."
import zlib from "zlib"

const router = Router()

router.get("/", (req, res) => {
    res.redirect(`https://auth.hackclub.com/oauth/authorize?client_id=${process.env.HCAUTH_CLIENT_ID}&redirect_uri=${process.env.HCAUTH_REDIRECT_URI}&response_type=code&scope=email`)
})

router.get(`/callback`, async (req, res) => {
    
})

export default router