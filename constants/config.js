const corsOptions = {
  origin: "https://chat-app-2024-eta.vercel.app",

  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};

const CHATTU_TOKEN = "chattu-token";

export { corsOptions, CHATTU_TOKEN };
