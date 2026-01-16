import dbConnect from './lib/dbConnect';

export default async function handler(req, res) {
  try {
    await dbConnect();
    res.status(200).json({ status: "Success", message: "Connected to MongoDB via Vercel!" });
  } catch (error) {
    res.status(500).json({ status: "Error", error: error.message });
  }
}