import * as React from 'react';
import {
  ClientOptions,
  loadSandpackClient,
  SandboxSetup
} from '@codesandbox/sandpack-client';

export function SandpackWidget() {
  React.useEffect(() => {
    const iframe = document.getElementById(
      'sandpack-iframe'
    ) as HTMLIFrameElement;
    const content: SandboxSetup = {
      files: {
        '/App.js': {
          code: `
            import React from 'react';
            import ReactDOM from 'react-dom';
    
            function App() {
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
      },
      // Provide dependencies
      dependencies: {
        react: '^18.0.0',
        'react-dom': '^18.0.0'
      },
      entry: '/App.js'
      // template: 'react'
    };

    // Optional options
    const options: ClientOptions = { showOpenInCodeSandbox: false };
    // Properly load and mount the bundler
    loadSandpackClient(iframe, content, options);
  }, []);
  return <iframe style={{ flexGrow: 1 }} id="sandpack-iframe"></iframe>;
}
