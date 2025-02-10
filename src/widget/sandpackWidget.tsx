import * as React from 'react';
import {
  ClientOptions,
  loadSandpackClient,
  SandboxSetup
} from '@codesandbox/sandpack-client';
import { SandpackDocModel } from '../document/model';

export function SandpackWidget(props: { model: SandpackDocModel }) {
  React.useEffect(() => {
    const iframe = document.getElementById(
      'sandpack-iframe'
    ) as HTMLIFrameElement;
    const content: SandboxSetup = {
      files: {
        '/package.json': {
          code: JSON.stringify({
            main: 'App.js',
            dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' }
          })
        },
        '/tools.js': {
          code: `
            console.log('hello world')
            export const foo = 'bar'
          `
        },
        '/App.js': {
          code: `
            import React from 'react';
            import ReactDOM from 'react-dom';
            import { foo } from './tools.js';
            function App() {
              console.log(foo);
              return <h1>Hello, Sandpack!</h1>;
            }
    
            ReactDOM.render(<App />, document.getElementById('root'));
          `
        },
        '/index.html': {
          code: `
            <!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="UTF-8" />
                <title>Sandpack App</title>
              </head>
              <body>
                <div id="root"></div>
                <script src="/App.js"></script>
              </body>
            </html>
          `
        }
      }
    };
    console.log(content);
    // Optional options
    const options: ClientOptions = {
      showOpenInCodeSandbox: false,
      showLoadingScreen: true
    };
    // Properly load and mount the bundler
    loadSandpackClient(iframe, content, options);
  }, []);
  return <iframe style={{ flexGrow: 1 }} id="sandpack-iframe"></iframe>;
}
