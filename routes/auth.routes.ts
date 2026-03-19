
import { Router } from "express"
const router = Router()

router.get("/", (req, res) => {
    const params = new URLSearchParams({
        client_id: process.env.HCAUTH_CLIENT_ID!,
        redirect_uri: process.env.HCAUTH_REDIRECT_URI!,
        response_type: "code",
        scope: "email"
    })

    res.redirect(`https://auth.hackclub.com/oauth/authorize?${params}`)
})

router.get(`/callback`, async (req, res) => {
    const { code } = req.query

    if (!code) {
        return res.status(400).send("Missing auth code")
    }

    try {
        const tokenRes = await fetch("https://auth.hackclub.com/oauth/token", {
            method: "POST",
            headers: { "Content-Type": "application/json"},
            body: JSON.stringify({
                client_id: process.env.HCAUTH_CLIENT_ID,
                client_secret: process.env.HCAUTH_CLIENT_SECRET,
                redirect_uri: process.env.HCAUTH_REDIRECT_URI,
                code,
                grant_type: "authorization_code",
            })
        })

        if (!tokenRes.ok) {
            const err = await tokenRes.text()
            console.error(`Token exchange fail: ${err}`)
            res.status(401).send("Authentication error")
        }

        const tokenData = await tokenRes.json() as { 
            access_token: string; 
            refresh_token: string; 
        }

        const me = await fetch("https://auth.hackclub.com/api/v1/me", {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`
            }
        })
        
        if (!me.ok) return res.status(401).send("Failed to fetch user profile")

        const user = await me.json() as {
            identity: {
                id: number
                primary_email: string
            }
        }

        const session = JSON.stringify({
            id: user.identity.id,
            email: user.identity.primary_email,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token
        })

        res.cookie("hcsession", Buffer.from(session).toString("base64"), {
            httpOnly: true,
            sameSite: "lax",
            maxAge: 1000 * 60 * 60 * 24 * 30,
            secure: process.env.NODE_ENV === "prod"
        })

        res.redirect("/")
    } catch (err) {
        console.error(`Auth callback error: ${err}`)
        res.status(500).send("Internal server error")
    }
})

router.get("/logout", (req, res) => {
    res.clearCookie("hcsession")
    res.redirect("/")
})

export default router