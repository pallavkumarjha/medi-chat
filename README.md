# Document Chat Application

<div align="center">
  <img src="public/logo.svg" alt="Document Chat Logo" width="200" />
  <h1>Chat with Your Documents</h1>
  <p>An AI-powered chat application that lets you have natural conversations with your documents</p>
  
</div>

## 🚀 Features

- **Natural Language Processing**: Ask questions about your documents in plain English
- **Document Processing**: Upload and process various document formats (PDF, TXT, etc.)
- **Context-Aware Responses**: AI understands the context of your conversation
- **Fast & Responsive**: Built with React and Vite for optimal performance

## 🛠️ Tech Stack

- **Frontend**: React, Vite
- **AI/ML**: LangChain, OpenAI
- **Backend**: Supabase (Vector Store)
- **Linting/Formatting**: ESLint, Prettier

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Supabase account
- OpenAI API key

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/document-chat.git
   cd document-chat
   ```

2. Install dependencies
   ```bash
   npm install
   # or
   yarn
   ```

3. Set up environment variables
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_OPENAI_API_KEY=your_openai_api_key
   ```

4. Start the development server
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

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

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 🙏 Acknowledgments

- [LangChain](https://langchain.com/) for the amazing AI orchestration
- [Supabase](https://supabase.com/) for the backend services
- [Vite](https://vitejs.dev/) for the amazing developer experience
- [React](https://react.dev/) for the awesome UI library

## 📬 Contact

Your Name - [@yourtwitter](https://twitter.com/yourtwitter) - your.email@example.com

Project Link: [https://github.com/yourusername/document-chat](https://github.com/yourusername/document-chat)

---

<div align="center">
  Made with ❤️ by Pallav
</div>
