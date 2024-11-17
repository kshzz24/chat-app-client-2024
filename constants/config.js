const corsOptions = {
  origin: [
    "https://chat-app-2024-7l6qsz9du-nothing-matters-projects.vercel.app/",
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};

const CHATTU_TOKEN = "chattu-token";

export { corsOptions, CHATTU_TOKEN };
