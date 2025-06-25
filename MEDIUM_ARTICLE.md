# From Zero to AI Chat Hero: Building a Document-Savvy Chatbot with React, Supabase & LangChain

*How I built a smart chatbot that understands documents using cutting-edge AI - and how you can too!*

## Why I Built This (And Why You Should Care)

Ever wished you could just ask your documents questions in plain English? That's exactly what I set out to build - but with a twist. I wanted to create something that wasn't just another chatbot, but an AI assistant that truly understands the context of uploaded documents.

In this article, I'll walk you through how I built a document-aware chatbot using React, Supabase, and LangChain. While I used NABH (National Accreditation Board for Hospitals) documents as my example, the principles apply to any domain where you need to extract insights from documents through natural conversation.

What makes this project special? It's not just about retrieving text - it's about understanding context, maintaining conversation history, and providing accurate, relevant answers based on the documents it's been trained on.

## The Tech Stack (Or, Why These Tools Rock)

Let's talk about the all-star lineup that makes this project tick:

- **React + Vite**: Because who likes waiting for builds? Vite's lightning-fast dev server is a game-changer.
- **LangChain**: The secret sauce that makes our AI understand and process documents like a pro.
- **Supabase**: Not just for authentication anymore! Their vector store is surprisingly easy to use.
- **OpenAI's GPT**: The brains behind the operation, making sense of all that text.

I chose these tools because they play well together and have excellent documentation - which means fewer headaches for me (and for you if you're following along!).

## How It All Fits Together

Before we dive into code, let me sketch out how everything connects:

1. **The Frontend (React)**: Where users chat with their documents
2. **The Brain (LangChain)**: Processes questions and finds relevant document chunks
3. **The Memory (Supabase)**: Stores document embeddings for quick lookup
4. **The Magic (OpenAI)**: Understands questions and crafts human-like responses

It's like having a super-smart librarian who's read all your documents and can instantly find exactly what you need!

## 📖 How It Works

This application uses a Retrieval-Augmented Generation (RAG) pipeline to answer questions based on a PDF document. Here's a step-by-step breakdown of the process:

### 1. Loading the Document

The first step is to load the PDF document from the `public/knowledge_base/` directory. We use LangChain's `PDFLoader` to load the document into memory.

**File:** `src/utils/embeddingUtils.js`
```javascript
const loader = new PDFLoader('knowledge_base/nabh_standards_guide.pdf');
const docs = await loader.load();
```

### 2. Creating Embeddings

Once the document is loaded, we split it into smaller, manageable chunks using the `RecursiveCharacterTextSplitter`. This allows us to create more focused embeddings for each section.

**File:** `src/utils/embeddingUtils.js`
```javascript
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 512,
  chunkOverlap: 64,
});
const splitDocs = await splitter.splitDocuments(docs);
```

Next, we use OpenAI's embedding model to convert these text chunks into numerical vectors (embeddings).

**File:** `src/utils/embeddingUtils.js`
```javascript
const embeddings = new OpenAIEmbeddings();
```

### 3. Storing Embeddings in Supabase

These embeddings are then stored in a Supabase vector database. This allows us to efficiently search for the most relevant document chunks when a user asks a question.

**File:** `src/utils/embeddingUtils.js`
```javascript
const vectorStore = await SupabaseVectorStore.fromDocuments(
  splitDocs,
  embeddings,
  {
    client,
    tableName: 'documents',
    queryName: 'match_documents',
  }
);
```

### 4. Creating a Standalone Question

When a user asks a question, it might be part of an ongoing conversation. To ensure the question is self-contained, we first pass it through a `standaloneQuestionChain`. This chain uses the conversation history to rephrase the question into a standalone query.

**File:** `src/utils/langchain.js`
```javascript
const standaloneQuestionTemplate = `Given some conversation history (if any) and a question,
 convert the question to a standalone question.
 conversation history: {conv_history}
 question: {question}
 standalone question:`

const standaloneQuestionPrompt = PromptTemplate.fromTemplate(standaloneQuestionTemplate)

const standaloneQuestionChain = standaloneQuestionPrompt.pipe(llm).pipe(new StringOutputParser());
```

### 5. Retrieving Relevant Documents

Once we have a standalone question, we use the `retriever` to search the Supabase vector store for the most relevant document chunks. The retriever is created from our vector store and is responsible for fetching the context needed to answer the question.

**File:** `src/utils/embeddingUtils.js`
```javascript
export const retriever = vectorStore.asRetriever();
```

This retriever is then used in a `retrieverChain` to fetch the relevant documents.

**File:** `src/utils/langchain.js`
```javascript
const retrieverChain = RunnableSequence.from([
  prevResult => prevResult.standalone_question,
  retriever,
  combineDocuments
])
```

### 6. Answering the Question

Finally, we use an `answerChain` to generate a response. This chain takes the standalone question and the retrieved document chunks (the context) and passes them to the OpenAI model. The model then generates a human-like answer based on the provided information.

**File:** `src/utils/langchain.js`
```javascript
const answerTemplate = `
Prompt:
As a medical assistant knowledgeable about NABH standards, 
your goal is to provide accurate answers to questions raised by the end user. 
You should rely on the context provided and refer to the conversation history when 
necessary to ensure the correctness of your responses. Avoid fabricating information; 
if uncertain, humbly seek advice from a human and maintain a friendly demeanor throughout. 
Your role is to assist as a reliable source of information while maintaining a 
supportive and approachable tone. Remember to prioritize accuracy and clarity in your responses.
context: {context}
question: {question}
conversation history: {conv_history}
answer: `

const answerPrompt = PromptTemplate.fromTemplate(answerTemplate);
const answerChain = answerPrompt.pipe(llm).pipe(new StringOutputParser())
```

### 7. Combining the Chains

All these individual chains are combined into a single, powerful `RunnableSequence`. This sequence orchestrates the entire process, from creating a standalone question to generating the final answer.

**File:** `src/utils/langchain.js`
```javascript
const chain = RunnableSequence.from([
  {
    standalone_question: standaloneQuestionChain,
    original_input: new RunnablePassthrough()
  },
  {
    context: retrieverChain,
    question: ({ original_input }) => original_input.question,
    conv_history: ({ original_input }) => original_input.conv_history,
  },
  answerChain
])
```

This final chain is what we invoke in our application to get a response to the user's question.

## Keeping Things Secure (Because We're Responsible Like That)

We implemented authentication using Supabase Auth:

```javascript
// src/utils/auth.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signUpWithEmail(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}
```

## From Prototype to Production (No Sleepless Nights, I Promise)

### 1. Code Splitting

We implemented route-based code splitting to reduce the initial bundle size:

```jsx
// src/App.jsx
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

function App() {
  return (
    <Router>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
```

### 2. Environment Configuration

We set up different environment configurations for development and production:

```env
# .env.development
VITE_API_URL=http://localhost:3000
VITE_DEBUG=true

# .env.production
VITE_API_URL=https://api.medichat.app
VITE_DEBUG=false
```

## Testing Strategy

We implemented a comprehensive testing strategy:

1. **Unit Tests**: For utility functions and components
2. **Integration Tests**: For testing component interactions
3. **End-to-End Tests**: For testing complete user flows

```javascript
// Example test for the message component
import { render, screen } from '@testing-library/react';
import { Message } from './Message';

describe('Message', () => {
  it('renders user message correctly', () => {
    render(<Message message="Hello" isUser={true} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /user/i })).toBeInTheDocument();
  });
});
```

## Deployment

We deployed our application using Vercel with the following configuration:

1. **Build Command**: `npm run build`
2. **Output Directory**: `dist`
3. **Environment Variables**: Set in Vercel dashboard
4. **Custom Domain**: Configured with SSL

## Performance Optimization

1. **Lazy Loading**: Implemented for routes and heavy components
2. **Image Optimization**: Used next/image for optimized images
3. **Bundle Analysis**: Regular bundle size monitoring
4. **Caching**: Implemented service workers for offline support

## Oops, That Didn't Work: Lessons Learned

### 1. Handling Large PDFs

**Challenge**: Processing large medical documents was causing performance issues.

**Solution**: We implemented chunking and streaming to process documents in smaller parts.

### 2. Maintaining Context

**Challenge**: The AI sometimes lost context in longer conversations.

**Solution**: We implemented a sliding window approach to maintain relevant conversation history.

### 3. Security

**Challenge**: Securing sensitive medical data.

**Solution**: Implemented row-level security in Supabase and encrypted sensitive data.

## What's Next? (Spoiler: It Gets Even Cooler)

1. **Multi-language Support**: Add support for multiple languages
2. **Voice Input**: Implement voice-to-text functionality
3. **Document Annotation**: Allow users to annotate and highlight important sections
4. **Collaboration Features**: Enable multiple users to collaborate on documents
5. **Advanced Analytics**: Add usage analytics and insights

## Wrapping Up: Your Turn to Build!

Phew! We've covered a lot of ground, haven't we? From processing documents to creating a slick chat interface, we've built something truly powerful.

What I love most about this project is how it demonstrates the incredible potential of combining modern web technologies with AI. The best part? This is just the beginning. The techniques we've used can be applied to all sorts of domains - legal documents, research papers, technical documentation, you name it.

I encourage you to take this code, play with it, break it, and make it your own. The world needs more tools that make information accessible, and you're now equipped to build them!

## Helpful Resources (Because We've All Been Stuck at 2 AM)

- [The Code (GitHub)](https://github.com/yourusername/medi-chat) - Feel free to star it if you find it helpful!
- [Supabase Docs](https://supabase.com/docs) - Their vector database is surprisingly easy to use
- [LangChain Documentation](https://langchain.com/docs/) - For when you want to level up your AI game
- [React Docs](https://react.dev/) - Because hooks still confuse me sometimes too

If you get stuck or have questions, don't hesitate to reach out. The dev community is all about helping each other out!

## Let's Connect!

Hey, I'm Pallav! I build things with code and write about my journey. If you found this article helpful or have questions, I'd love to hear from you!

- Follow me on [LinkedIn](https://www.linkedin.com/in/pallav-agarwal-576b3b1b/) for more tech insights
- Check out my [GitHub](https://github.com/pallavagarwal07) for other cool projects
- Star the [GitHub repo](https://github.com/pallavagarwal07/medi-chat) if you found this useful

## One Last Thing...

If you enjoyed this article, consider sharing it with someone who might find it helpful. And if you build something amazing with this code, I'd love to see it - tag me or drop a link in the comments!

Happy coding! 🚀

---
*P.S. This project is for educational purposes. Always verify important information from official sources before making any critical decisions.*
