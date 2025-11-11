"use client";
import { Amplify } from "aws-amplify";
import outputs from "../../amplify_outputs.json";

Amplify.configure(outputs);
console.log("✅ Amplify（/test環境）初期化完了");
