# CleanMove - Lease Advisor (Jiyuan's Version)

This folder contains the CleanMove application with the integrated Lease Advisor functionality from Jiyuan's version.

## 🎯 What's Included

### Core Features
- **Lease Advisor (Jiyuan's Version)** - Comprehensive rental contract analysis with:
  - PDF upload support
  - Text input support
  - Location-specific legal advice
  - Multi-language support (English, 中文, Spanish, French, German, Japanese)
  - Three-section analysis format:
    - Important Information in the Rental Contract
    - Important Information Tenants Often Forget
    - Important Local Legal Information

### Additional Features
- Checklist & Photos management
- Move-in/Move-out photo tracking
- PDF report generation
- Login system (Renter/Admin)

## 📁 Key Files

### Lease Advisor Implementation
- `src/app/api/analyze-lease/route.ts` - API endpoint for lease analysis
- `src/app/app/page.tsx` - Main app page with Lease Advisor tab

### Configuration
- `src/config.ts` - API key configuration
- `.env.local` - Environment variables (create if needed)

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up API key:**
   - Get your Gemini API key from: https://aistudio.google.com/app/apikey
   - Add it to `src/config.ts` or create `.env.local` with:
     ```
     GOOGLE_GEMINI_API_KEY=your_api_key_here
     ```

3. **Run the app:**
   ```bash
   npm run dev
   ```

4. **Access the app:**
   - Landing page: http://localhost:3000
   - Login page: http://localhost:3000/login
   - Main app: http://localhost:3000/app

## 📝 Usage

1. Navigate to the **Lease Advisor** tab
2. Choose input method:
   - **Upload PDF**: Upload your lease PDF file
   - **Paste Text**: Paste contract text directly
3. Enter location information (e.g., "New York, NY")
4. Select output language
5. Click "Analyze Contract" or upload PDF
6. View comprehensive analysis with three main sections

## 🔧 Technical Details

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI Model**: Google Gemini 2.5 Flash
- **API**: RESTful API routes in `/api/analyze-lease`

## 📦 Dependencies

See `package.json` for full list. Key dependencies:
- `next`: 16.0.3
- `react`: 19.2.0
- `@google/generative-ai`: ^0.24.1
- `pdf-lib`: ^1.17.1

## 📄 License

MIT License - feel free to use for your projects!

---

**Note**: This is a clean copy of the project with all essential files. The `node_modules` folder is not included - run `npm install` to install dependencies.

