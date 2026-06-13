# Use the official Python lightweight image
FROM python:3.13-slim

# Set the working directory
WORKDIR /app

# Install system dependencies for psycopg2
RUN apt-get update && apt-get install -y libpq-dev gcc && rm -rf /var/lib/apt/lists/*

# Copy requirements if available, otherwise just pip install what we know
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt || true
RUN pip install fastapi uvicorn "pydantic>=2.0.0" "langchain>=0.1.0" "langchain-openai>=0.1.0" "SQLAlchemy>=2.0.0" "psycopg2-binary>=2.9.0" pyjwt bcrypt python-dotenv

# Copy the entire backend directory into the container
COPY . .

# Expose the Cloud Run port (8080 is default for Cloud Run)
EXPOSE 8080

# Command to run the uvicorn server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
