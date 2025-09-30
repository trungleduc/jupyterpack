<h1 align="center">jupyterpack</h1>

[![Github Actions Status](https://github.com/trungleduc/jupyterpack/workflows/Build/badge.svg)](https://github.com/trungleduc/specta/actions/workflows/build.yml)
[![Try on lite](https://jupyterlite.rtfd.io/en/latest/_static/badge.svg)](https://trungleduc.github.io/jupyterpack/lab/)

<h2 align="center"> A JupyterLite extension to serve in-browser Python and Javascript web application</h2>

## Features

- **Python Web Apps**: Serve Python web applications directly in the browser using JupyterLite's in-browser Python kernel. `jupyterpack` currently supports Dash.
- **JavaScript Web Apps**: Bundle and serve JavaScript web applications using in-browser bundlers.

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

Double clicking the `spk` file to open the web app as a tab of JupyterLab.

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

For the Dash code, you need to define your Dash app variable as `app` and do not call `app.run_server` directly, `jupyterpack` will handle the server for you. Just as the case of React app, double clicking the spk file will open the Dash app in a new JupyterLab tab.

## Try it online!

You can try it online by clicking on this badge:

[![Try on lite](https://jupyterlite.rtfd.io/en/latest/_static/badge.svg)](https://trungleduc.github.io/jupyterpack/lab/)

## License

jupyterpack is licensed under the BSD-3-Clause license.
