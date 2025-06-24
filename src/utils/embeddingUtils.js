import { WebPDFLoader } from '@langchain/community/document_loaders/web/pdf';
import { createClient } from '@supabase/supabase-js';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { OpenAIEmbeddings } from '@langchain/openai';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import workerSrc from 'pdfjs-dist/build/pdf.worker?url';

function cleanText(text) {
  return text
    .replace(/[\x00-\x1F\x7F]/g, '') // Control chars
    .replace(/[\u200B-\u200F\uFEFF]/g, '') // Invisible unicode
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/Page\s+\d+(\s+of\s+\d+)?/gi, '') // Remove page footers
    .replace(/Confidential|Draft\s+Copy|Do\s+Not\s+Distribute/gi, '') // Remove boilerplate
    .trim();
}

function cleanDocs(docs) {
  return docs
    .map(doc => ({
      ...doc,
      pageContent: cleanText(doc.pageContent)
    }))
    .filter(doc => doc.pageContent.length > 20); // Skip too-short pages
}

export const combineDocuments = (docs) => {
  return docs.map(doc => doc.pageContent).join('\n\n');
}

// Initialize OpenAI and Supabase clients
const openAIApiKey = import.meta.env.VITE_OPENAI_API_KEY;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Initialize embeddings and LLM
const embeddings = new OpenAIEmbeddings({ openAIApiKey });
export const llm = new ChatOpenAI({ openAIApiKey });
const client = createClient(supabaseUrl, supabaseKey);

// Initialize vector store
const vectorStore = new SupabaseVectorStore(embeddings, {
  client,
  tableName: 'documents',
  queryName: 'match_documents'
});

// Template for standalone question generation
const standaloneQuestionTemplate = `Given a question, convert it to a standalone question. Question: {question} standalone question:`;
export const standaloneQuestionPrompt = PromptTemplate.fromTemplate(standaloneQuestionTemplate);

/**
 * Get a retriever chain for question answering
 * @returns {Object} A retriever chain
 */
export const retriever = vectorStore.asRetriever();

export const getRetrieverChain = () => {
  
  return standaloneQuestionPrompt.pipe(llm).pipe(new StringOutputParser()).pipe(retriever);
};

export const loadAndStoreEmbeddings = async () => {
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

    const pdfResponse = await fetch('/knowledge_base/nabh_standards_guide.pdf');
    const pdfBlob = await pdfResponse.blob();

    const pdfLoader = new WebPDFLoader(pdfBlob, {
      parsedItemSeparator: '',
      pdfjs: () => pdfjs
    });

    const docs = await pdfLoader.load();
    const cleanedDocs = cleanDocs(docs);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const openAIApiKey = import.meta.env.VITE_OPENAI_API_KEY;
    const client = createClient(supabaseUrl, supabaseKey);

    await SupabaseVectorStore.fromDocuments(
      cleanedDocs,
      new OpenAIEmbeddings({ openAIApiKey }),
      {
        client,
        tableName: 'documents',
      }
    );

    return { success: true, message: 'Embeddings created and stored successfully' };
  } catch (error) {
    console.error('Error in loadAndStoreEmbeddings:', error);
    return { success: false, error: error.message };
  }
};
