export const validate =
  (schema, source = "body") =>
  (req, res, next) => {
    const data = source === "query" ? req.query : req.body;

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      allowUnknown: source === "query",
      stripUnknown: true,
    });

    if (error) {
      const messages = error.details.map((d) => d.message);

      return res.status(400).json({
        success: false,
        message: messages[0],
        errors: messages,
      });
    }

    // Write the transformed value back so controllers read clean data.
    if (source === "query") {
      req.validatedQuery = value; // backward-compat alias always set

      const existingKeys = Object.keys(req.query);
      for (const key of existingKeys) {
        if (!(key in value)) {
          try {
            delete req.query[key];
          } catch {
            // Some environments disallow deletion; ignore silently
          }
        }
      }
      for (const [key, val] of Object.entries(value)) {
        try {
          req.query[key] = val;
        } catch {
          // If setter is unavailable, validatedQuery is the fallback
        }
      }
    } else {
      req.body = value;
      req.validatedBody = value; // backward-compat alias
    }

    next();
  };
