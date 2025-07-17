import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { connectDB } from "@/lib/db"
import { User } from "../../../../models/user"
// import { registerSchema } from "@/lib/validation"
import jwt from "jsonwebtoken"

export async function POST(req: Request) {
  try {
    await connectDB()

    const body = await req.json()
    console.log(body);
    if (!body) {
      return NextResponse.json(
        { message: "All the fields are required" },
        { status: 400 }
      )
    }

    const { email, password, name, clientId, clientSecret, tenantId } = body

    const existingUser = await User.findOne({ email })

    if (existingUser) {
      const isMatch = await bcrypt.compare(password, existingUser.password)
      if (!isMatch) {
        return NextResponse.json({ error: "User already exists, but password is incorrect" }, { status: 401 })
      }

      // Auto-login (issue JWT)
      const token = jwt.sign(
        { id: existingUser._id, email: existingUser.email },
        process.env.JWT_SECRET!,
        { expiresIn: "7d" }
      )

      const res = NextResponse.json({ message: "User already existed, logged in" })
      res.cookies.set("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      })

      return res
    }

    // New user registration
    const hashed = await bcrypt.hash(password, 10)
    const newUser = await User.create({
      email,
      password: hashed,
      name,
      accountCredentials: {
        clientId,
        clientSecret,
        tenantId,
      }
    });


    const token = jwt.sign(
      { id: newUser._id, email: newUser.email },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    )

    const res = NextResponse.json({ message: "User registered and logged in" })
    res.cookies.set("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    })

    return res
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}