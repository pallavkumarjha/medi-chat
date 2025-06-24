import { llm, retriever, combineDocuments } from './embeddingUtils';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnablePassthrough, RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { formatConvHistory } from './formatConvHistory';

const standaloneQuestionTemplate = `Given some conversation history (if any) and a question,
 convert the question to a standalone question.
 conversation history: {conv_history}
 question: {question}
 standalone question:`;

const standaloneQuestionPrompt = PromptTemplate.fromTemplate(standaloneQuestionTemplate);

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
answer: `;

const answerPrompt = PromptTemplate.fromTemplate(answerTemplate);

const standaloneQuestionChain = standaloneQuestionPrompt.pipe(llm).pipe(new StringOutputParser());

const retrieverChain = RunnableSequence.from([
  prevResult => prevResult.standalone_question,
  retriever,
  combineDocuments
]);

const answerChain = answerPrompt.pipe(llm).pipe(new StringOutputParser());

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
]);

export const getResponse = async (messages, inputMessage) => {
  try {
    const response = await chain.invoke({
      question: inputMessage,
      conv_history: formatConvHistory(messages)
    });
    return response;
  } catch (error) {
    console.error('Error getting question response:', error);
    return "Error getting response.";
  }
};
