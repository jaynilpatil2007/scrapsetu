# ScrapSetu

## Run Locally

Prerequisites: Git, Node.js 20.9 or later, npm, and a PostgreSQL database.

Clone the repository and install dependencies:

```bash
git clone https://github.com/jaynilpatil2007/scrapsetu.git
cd scrapsetu
npm install
```

Create a `.env` file in the project root with your local configuration:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
OPENROUTER_API_KEY="your-openrouter-api-key"
```

Apply database migrations, then start the development server:

```bash
npx prisma migrate deploy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). `OPENROUTER_API_KEY` is needed for AI features.
