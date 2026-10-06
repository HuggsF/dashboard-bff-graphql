import { ApolloProvider } from '@apollo/client/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { apolloClient } from './lib/apollo';
import './styles.css';

const root = document.getElementById('root');
if (root === null) throw new Error('#root element not found in index.html');

createRoot(root).render(
  <StrictMode>
    <ApolloProvider client={apolloClient}>
      <App />
    </ApolloProvider>
  </StrictMode>,
);
