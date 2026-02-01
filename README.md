<h1 align="center">jupyterpack</h1>

[![Github Actions Status](https://github.com/trungleduc/jupyterpack/workflows/Build/badge.svg)](https://github.com/trungleduc/specta/actions/workflows/build.yml)
[![Try on lite](https://jupyterlite.rtfd.io/en/latest/_static/badge.svg)](https://trungleduc.github.io/jupyterpack/lab/)

<h2 align="center">In-browser Python and JavaScript web applications for JupyterLite</h2>

`jupyterpack` brings in-browser Python and JavaScript web applications to the JupyterLite ecosystem. Built as a JupyterLite extension, it allows applications to run, serve, and interact fully client-side, with no backend required.

<br/>

![Image](https://github.com/user-attachments/assets/22849fe8-199f-4d9f-ad45-055bccf88bad)

## Features

- **Python Web Apps**: Serve Python web applications directly in the browser using JupyterLite's in-browser Python kernel. `jupyterpack` currently supports:
  - [**Dash**](https://github.com/plotly/dash)
  - [**Streamlit**](https://github.com/streamlit/streamlit)
  - [**Panel**](https://github.com/holoviz/panel)
  - [**Shiny for Python**](https://github.com/posit-dev/py-shiny)
  - [**Textual**](https://github.com/Textualize/textual)
  - [**Vizro**](https://github.com/mckinsey/vizro)
  - [**FastHTML**](https://github.com/AnswerDotAI/fasthtml)
  - [**Gradio**](https://github.com/gradio-app/gradio)
  - [**Mesop**](https://github.com/mesop-dev/mesop)
  - [**NiceGUI**](https://github.com/zauberzeug/nicegui)

  You can also use `jupyterpack` to serve any [**Flask**](https://github.com/pallets/flask), [**Starlette**](https://github.com/Kludex/starlette) or [**Tornado**](https://github.com/tornadoweb/tornado) application. Example of each framework can be found in the [demo](https://github.com/trungleduc/jupyterpack/tree/main/demo/files) folder.

- **JavaScript Web Apps**: Bundle and serve JavaScript web applications using in-browser bundlers.

- **Direct link to your app**: Share your app with others by generating a direct link to your app. This link can be shared with anyone and will open your app in the browser (see the [toolbar buttons](https://github.com/trungleduc/jupyterpack/edit/main/README.md#toolbar-buttons)).

## Installation

You can install `jupyterpack` using `pip` or `conda`

```bash
# Install using pip
pip install jupyterpack

# Install using conda
conda install -c conda-forge jupyterpack
```

## Try it online!

You can try it online by clicking on this badge:

[![Try on lite](https://jupyterlite.rtfd.io/en/latest/_static/badge.svg)](https://trungleduc.github.io/jupyterpack/lab/)

## Setting up JupyterLite deployment

`jupyterpack` currently supports only `xeus-python` kernel and does **not** support `pyodide-kernel`. You can refer to the `xeus-python` [official documentation](https://jupyterlite-xeus.readthedocs.io/en/stable/deploy.html) for the base setup of JupyterLite with `xeus-python` kernel.

## Usage

### Using shebang in python script

You can use `jupyterpack` to run your application script by adding the following shebang to the top of your Python script:

```
#! jupyterpack.<name-of-the-used-framework>
```

The available shebang options are:

- `#! jupyterpack.dash` for Dash
- `#! jupyterpack.streamlit` for Streamlit
- `#! jupyterpack.panel` for Panel
- `#! jupyterpack.shiny` for Shiny
- `#! jupyterpack.textual` for Textual
- `#! jupyterpack.vizro` for Vizro
- `#! jupyterpack.fasthtml` for Fasthtml
- `#! jupyterpack.gradio` for Gradio
- `#! jupyterpack.mesop` for Mesop
- `#! jupyterpack.nicegui` for NiceGUI

After adding the shebang, you have two options to run your application:

1. **Open from file browser**: Right-click the Python file in JupyterLab and select `Open with` > `Jupyterpack`.
2. **Using toolbar buttons**: Open the Python file using the `Editor` then click on `Open with Jupyterpack` button in the toolbar.

### Using a `.spk` file

Instead of using a shebang, you can create a `.spk` file to define your application. Using a `spk` file is useful when you want to specify additional configurations or dependencies for your application.

Here's an example structure of a React application:

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

### Toolbar buttons

Once the app is loaded, you can interact with it using the toolbar buttons:

- **Reload**: Reload the app manually after editing the code.
- **Toggle autoreload**: Enable or disable autoreloading of the app when files change.
- **Open in Specta**: Open the app in full-screen mode without JupyterLab UI elements
- **Copy link to clipboard**: Copy a shareable link to your application. Anyone with the link can access your app.

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

  | Value       | Description                                                         |
  | ----------- | ------------------------------------------------------------------- |
  | `react`     | React-based frontend application                                    |
  | `dash`      | [Plotly Dash](https://github.com/plotly/dash) application           |
  | `streamlit` | [Streamlit](https://github.com/streamlit/streamlit) application     |
  | `shiny`     | [Shiny](https://github.com/posit-dev/py-shiny) application (Python) |
  | `panel`     | [Panel](https://github.com/holoviz/panel) application               |
  | `textual`   | [Textual](https://github.com/Textualize/textual) application        |
  | `tornado`   | [Tornado](https://github.com/tornadoweb/tornado) web application    |
  | `starlette` | [Starlette](https://github.com/Kludex/starlette) web application    |

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
  },
  "disableDependencies": false
}
```

## Framework-specific configurations

Each framework requires specific setup and runtime configuration. This section covers framework-specific requirements and how `Jupyterpack` handles dependencies.

By default, `Jupyterpack` automatically installs framework dependencies at runtime when you run your application. However, you can optimize startup time by preinstalling dependencies directly into your JupyterLite build. When dependencies are preinstalled, disable automatic installation by setting `disableDependencies: true` in your `.spk` file.

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

Here is the environment file for Dash applications:

```yaml
name: xeus-kernels
channels:
  - https://repo.prefix.dev/emscripten-forge-dev
  - https://repo.prefix.dev/conda-forge
dependencies:
  - xeus-python
  - jupyterpack
  - dash
  - werkzeug>=2.2,<3.0
  - blinker>=1.5.0,<2
  - cachetools>=4.0,<7
  - pip:
      - pyodide_http
```

### Streamlit application

There are no special requirements for Streamlit applications, just write your code as a standard Streamlit application and do **not** start the server manually — `jupyterpack` will handle execution and serving automatically.

Opening the `.spk` file will launch the Streamlit app in a new JupyterLab tab.

Since `streamlit` can't be installed using `conda`, you need to install in in the `pip` section. Here is the environment file for Streamlit applications:

```yaml
name: xeus-kernels
channels:
  - https://repo.prefix.dev/emscripten-forge-dev
  - https://repo.prefix.dev/conda-forge
dependencies:
  - xeus-python
  - jupyterpack
  - blinker>=1.5.0,<2
  - cachetools>=4.0,<7
  - protobuf
  - altair
  - pyarrow
  - pip:
      - streamlit>=1.50.0
      - pyodide_http
```

### Shiny application

`jupyterpack` supports both **Shiny Express** and **Shiny Core** applications.

- **Shiny Express**: no special requirements.
- **Shiny Core**: the application instance must be assigned to a variable named `app`.

In both cases, the server is managed by `jupyterpack`, and opening the `.spk` file will launch the app in JupyterLab.

Here is the environment file for Shiny applications:

```yaml
name: xeus-kernels
channels:
  - https://repo.prefix.dev/emscripten-forge-dev
  - https://repo.prefix.dev/conda-forge
dependencies:
  - xeus-python
  - jupyterpack
  - pip:
      - shiny
      - shinychat
      - pyodide_http
```

### Panel application

There are no special requirements for Panel applications, just write your code as a standard Panel application and call `.servable()` on the layout you want to serve.

Here is the environment file for Panel applications:

```yaml
name: xeus-kernels
channels:
  - https://repo.prefix.dev/emscripten-forge-dev
  - https://repo.prefix.dev/conda-forge
dependencies:
  - xeus-python
  - jupyterpack
  - panel
  - pip:
      - pyodide_http
```

### Textual application

You must define your Textual application as a variable named `app` and do not call `app.run()` yourself — `jupyterpack` is responsible for starting and managing the server lifecycle.

Here is the environment file for Textual applications:

```yaml
name: xeus-kernels
channels:
  - https://repo.prefix.dev/emscripten-forge-dev
  - https://repo.prefix.dev/conda-forge
dependencies:
  - xeus-python
  - jupyterpack
  - textual
  - textual-serve
  - pip:
      - pyodide_http
```

### Vizro application

There are no special requirements for Vizro applications, just write your code as a standard Vizro application and call `Vizro().build(...).run()` to serve your dashboard.

Here is the environment file for Vizro applications:

```yaml
name: xeus-kernels
channels:
  - https://repo.prefix.dev/emscripten-forge-dev
  - https://repo.prefix.dev/conda-forge
dependencies:
  - xeus-python
  - jupyterpack
  - werkzeug>=2.2,<3.0
  - blinker>=1.5.0,<2
  - cachetools>=4.0,<7
  - vizro
  - pip:
      - pyodide_http
```

### FastHTML application

There are no special requirements for FastHTML applications, just write your code as a standard FastHTML application. You should not call `serve()` yourself — jupyterpack is responsible for starting and managing the server lifecycle.
Here is the environment file for FastHTML applications:

```yaml
name: xeus-kernels
channels:
  - https://repo.prefix.dev/emscripten-forge-dev
  - https://repo.prefix.dev/conda-forge
dependencies:
  - xeus-python
  - jupyterpack
  - fastapi
  - fastcore
  - fastlite
  - itsdangerous
  - oauthlib
  - beautifulsoup4
  - pip:
      - python-fasthtml
      - uvicorn
      - pyodide_http
```

### Gradio application

There are no special requirements for Gradio applications, just write your code as a standard Vizro application and call the `launch` method to serve your dashboard.

Due to the setup of Gradio, you need to put `gradio` and `gradio-client` in the pip section of the `environment.yml` file. For the remaininng dependencies, they are handled by `jupyterpack` automatically, but you can also specify them in the `environment.yml` file to improve the loading time. Here is the example of the `environment.yml` file for Gradio.
Here is the environment file for Gradio applications:

```yaml
name: xeus-kernels
channels:
  - https://repo.prefix.dev/emscripten-forge-dev
  - https://repo.prefix.dev/conda-forge
dependencies:
  - xeus-python
  - jupyterpack
  - fastapi
  - pillow
  - huggingface_hub
  - aiofiles
  - safehttpx
  - semantic_version
  - pydub
  - tomlkit
  - pip:
      - gradio
      - gradio-client
      - pyodide_http
```

### Mesop application

There are no special requirements for Mesop applications. Just write your code as a standard Mesop application, and opening the `.spk` file will launch the app in JupyterLab.

Since Mesop is not available in the conda-forge channel. You need to install it via pip.
Here is the environment file for Mesop applications:

```yaml
name: xeus-kernels
channels:
  - https://repo.prefix.dev/emscripten-forge-dev
  - https://repo.prefix.dev/conda-forge
dependencies:
  - xeus-python
  - jupyterpack
  - flask
  - absl-py
  - deepdiff>=8.6.1,<9
  - msgpack
  - pydantic
  - python-dotenv
  - sqlalchemy
  - pip:
      - mesop
      - flask-sock
      - pyodide_http
```

### NiceGUI application

There are no special requirements for NiceGUI applications. Jupyterpack supports creating pages using the page decorator, root function and script mode.

Due to the setup of NiceGUI, you need to include it into the `pip` section of the environment file. Here is an example environment file for NiceGUI applications:

```yaml
name: xeus-kernels
channels:
  - https://repo.prefix.dev/emscripten-forge-dev
  - https://repo.prefix.dev/conda-forge
dependencies:
  - xeus-python
  - jupyterpack
  - python-multipart
  - python-socketio
  - pydantic >=1.10.21,<3.0
  - fastapi
  - rich
  - markdown2
  - itsdangerous
  - ifaddr
  - jinja2
  - docutils
  - vbuild
  - wait_for2
  - pip:
      - nicegui
      - pyodide_http
```

## License

jupyterpack is licensed under the BSD-3-Clause license.
