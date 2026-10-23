import jwt from "jsonwebtoken";

export const companyAuth = (req, res, next) => {
  try {
    const token = req.cookies?.companyToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Please login to access the company workspace.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "company" || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid company authentication.",
      });
    }

    req.companyId = decoded.id;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Company session is invalid or expired.",
    });
  }
};