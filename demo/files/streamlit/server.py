import streamlit as st

st.title("Hello, Streamlit! 👋")
st.write("Welcome to your first Streamlit app.")
st.write("This text is rendered directly from Python code.")

st.title("Hello, Streamlit! 👋")

name = st.text_input("What's your name?")
if name:
    st.success(f"Nice to meet you, {name}!")
