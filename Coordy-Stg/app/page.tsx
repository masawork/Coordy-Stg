"use client";

import { useState, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import "./../app/app.css";
import { Amplify } from "aws-amplify";
import outputs from "@/amplify_outputs.json";
import "@aws-amplify/ui-react/styles.css";
import { getCurrentUser } from "aws-amplify/auth";

Amplify.configure(outputs);

const client = generateClient<Schema>();

export default function App() {
  const [todos, setTodos] = useState<Array<Schema["Todo"]["type"]>>([]);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    // 現在のユーザーIDを取得
    getCurrentUser()
      .then((user) => {
        setUserId(user.userId);
      })
      .catch((err) => {
        console.error("ユーザー取得エラー:", err);
      });
  }, []);

  function listTodos() {
    client.models.Todo.observeQuery().subscribe({
      next: (data) => setTodos([...data.items]),
    });
  }

  useEffect(() => {
    if (userId) {
      listTodos();
    }
  }, [userId]);

  async function createTodo() {
    if (!userId) {
      alert("ログインが必要です");
      return;
    }

    const title = window.prompt("Todo title");
    if (!title) return;

    const description = window.prompt("Todo description (optional)") || undefined;

    try {
      await client.models.Todo.create({
        userId,
        title,
        description,
      });
    } catch (error) {
      console.error("Todo作成エラー:", error);
      alert("Todoの作成に失敗しました");
    }
  }
    
  function deleteTodo(id: string) {
    client.models.Todo.delete({ id });
  }

  return (
    <main>
      <h1>My todos</h1>
      <button onClick={createTodo} disabled={!userId}>
        + new
      </button>
      {!userId && <p>ログインが必要です</p>}
      <ul>
        {todos.map(todo => 
          <li onClick={() => deleteTodo(todo.id)} 
            key={todo.id}>
            {todo.title}
            {todo.description && <span> - {todo.description}</span>}
          </li>)}
      </ul>
      <div>
        🥳 App successfully hosted. Try creating a new todo.
        <br />
        <a href="https://docs.amplify.aws/nextjs/start/quickstart/nextjs-app-router-client-components/">
          Review next steps of this tutorial.
        </a>
      </div>
    </main>
  );
}
