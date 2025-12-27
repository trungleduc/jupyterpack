<h1 align="center">jupyterpack</h1>

[![Github Actions Status](https://github.com/trungleduc/jupyterpack/workflows/Build/badge.svg)](https://github.com/trungleduc/specta/actions/workflows/build.yml)
[![Try on lite](https://jupyterlite.rtfd.io/en/latest/_static/badge.svg)](https://trungleduc.github.io/jupyterpack/lab/)

<h2 align="center"> A JupyterLite extension to serve in-browser Python and Javascript web application</h2>

## Features

- **Python Web Apps**: Serve Python web applications directly in the browser using JupyterLite's in-browser Python kernel. `jupyterpack` currently supports Dash, Streamlit and Shiny for Python. You can also use `jupyterpack` to serve any `asgi` or `wsgi` Python web application.
  .
- **JavaScript Web Apps**: Bundle and serve JavaScript web applications using in-browser bundlers.

![Image](https://github.com/user-attachments/assets/22849fe8-199f-4d9f-ad45-055bccf88bad)

## Installation

You can install `jupyterpack` using `pip` or `conda`

```bash
# Install using pip
pip install jupyterpack

# Install using conda
conda install -c conda-forge jupyterpack
```

## Usage

To use `jupyterpack`, you need to create a `.spk` file that defines your web application. Here's an example structure of a React application:

```bash
my_app/
├── app.spk
├── App.js         # Your JS code
├── package.json   # Your JS dependencies
└── index.html      # HTML entry for JS apps
```

the `app.spk` is the entry point of your React app, it should contain the following content:

```json
{
  "name": "React Example",
  "entry": "/index.html",
  "framework": "react"
}
```

Double-clicking the `spk` file to open the web app as a tab of JupyterLab.

## `.spk` — Jupyter Pack File Format

A **`.spk`** file describes how an application should be loaded, executed, and rendered in JupyterLite and JupyterLab.  
It defines the **entry point**, **framework**, optional **dependencies**, and runtime **metadata**, allowing reproducible execution across environments.

The file is expressed in **JSON**.

### Basic Structure

```typescript
interface IJupyterPackFileFormat {
  entry: string;
  framework: JupyterPackFramework;
  name?: string;
  metadata?: {
    autoreload?: boolean;
  };
  rootUrl?: string;
  dependencies?: IDependencies;
  disableDependencies?: boolean;
}
```

- `entry` (required): Path to the main entry file of the application. For examples:
  - _"app.py"_
  - _"/index.html"_
  - _"dashboard/index.py"_

  The path is resolved relative to the .spk file location.

- `framework` (required): The framework used to run the application. Supported frameworks are:

  | Value       | Description                      |
  | ----------- | -------------------------------- |
  | `react`     | React-based frontend application |
  | `dash`      | Plotly Dash application          |
  | `streamlit` | Streamlit application            |
  | `tornado`   | Tornado web application          |
  | `shiny`     | Shiny application (Python)       |
  | `starlette` | Starlette ASGI application       |

- `name` (optional): The name of the application. If not provided, the name will be the name of the .spk file.

- `metadata` (optional): Additional metadata for the application.
  - `autoreload`: Enables automatic reload when source files change.

- `rootUrl` (optional): The root URL of the web application. Default is `/`

- `dependencies` (optional): The dependencies of the web application. It will be merged with the default dependencies of the selected framework
  - `mamba`: Emscripten-forge packages
  - `pip`: PYPI packages
    Example:
    ```typescript
    dependencies: {
      mamba: ['numpy, scipy'];
      pip: ['plotly'];
    }
    ```

  You only need to specify the dependencies of the application, the required dependencies of the framework will be automatically added.


- `disableDependencies` (optional): Disable entirely the dependency installation. This is useful when dependencies are already provided by the environment. Default is `false`.

### Full example

```json
{
  "name": "Sales Dashboard",
  "entry": "app.py",
  "framework": "streamlit",
  "rootUrl": "/",
  "metadata": {
    "autoreload": true
  },
  "dependencies": {
    "mamba": ["numpy", "pandas"],
    "pip": []
  }
}
```

## Framework-specific configurations

### Dash application

Same as the React application, here is the structure of a Dash application:

```bash
my_app/
├── app.spk
├── server.py         # Your Dash code
```

the `app.spk` is the entry point of your Dash app, it should contain the following content:

```json
{
  "name": "Dash Example",
  "entry": "server.py",
  "framework": "dash"
}
```

For Dash applications, you must define your Dash instance as a variable named `app`.  
Do **not** call `app.run_server()` yourself — `jupyterpack` is responsible for starting and managing the server lifecycle.

As with React applications, double-clicking the `.spk` file will open the Dash app in a new JupyterLab tab.

### Streamlit application

Streamlit applications follow a similar structure to Dash apps.
Write your code as a standard Streamlit application and do **not** start the server manually — `jupyterpack` will handle execution and serving automatically.

Opening the `.spk` file will launch the Streamlit app in a new JupyterLab tab.

### Shiny application

Shiny applications also follow a structure similar to Dash apps.  
`jupyterpack` supports both **Shiny Express** and **Shiny Core** applications.

- **Shiny Express**: no special requirements.
- **Shiny Core**: the application instance must be assigned to a variable named `app`.

In both cases, the server is managed by `jupyterpack`, and opening the `.spk` file will launch the app in JupyterLab.

## Try it online!

You can try it online by clicking on this badge:

[![Try on lite](https://jupyterlite.rtfd.io/en/latest/_static/badge.svg)](https://trungleduc.github.io/jupyterpack/lab/)

## License

jupyterpack is licensed under the BSD-3-Clause license.
