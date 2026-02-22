export const VESPER_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "scan_instagram_profile",
      description: "Scanning Instagram profile. Session remains open after completion (allows further scanning).",
      parameters: {
        type: "object",
        properties: {
          username: { type: "string" },
          mode: { 
              type: "string", 
              enum: ["quick", "deep"],
              description: "Tryb: 'quick' (szybki) lub 'deep' (pełna analiza)." 
          },
          postLimit: {
              type: "integer",
              description: "Liczba postów. Domyślnie 3."
          }
        },
        required: ["username"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "manual_leak_search",
      description: "Searches breach databases (Identity Vault) for a specific phrase (e.g., Full Name, old email) and assigns the results to an existing target (username). Use this when automatic scanning did not detect the name in the bio or when you have additional known data about the target.",
      parameters: {
        type: "object",
        properties: {
          targetUsername: {
            type: "string",
            description: "Target username (login) to which we want to assign the results (e.g., “zenonbrzytwa”)."
          },
          query: {
            type: "string",
            description: "Phrase to search in breaches (e.g., “Zenon Brzytwa”, “stary.mail@onet.pl')."
          }
        },
        required: ["targetUsername", "query"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "end_investigation",
      description: "FORCEFULLY closes the bot session, destroys the browser instance, and terminates operation."
    }
  }
];
