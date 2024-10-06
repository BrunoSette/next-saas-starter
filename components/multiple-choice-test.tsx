"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { COLORS } from "@/lib/utils";
import { Question } from "@/lib/db/schema";
import { CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

export default function MultipleChoiceTest({ userId }: { userId: number }) {
  const searchParams = useSearchParams();
  const isTutor = searchParams.get("isTutor") === "true";
  const isTimed = searchParams.get("isTimed") === "true";
  const selectedSubjects = JSON.parse(
    searchParams.get("selectedSubjects") || "[]"
  ).map((id: string) => parseInt(id, 10));
  const questionMode = searchParams.get("questionMode") || "unused";
  const numberOfQuestions = parseInt(
    searchParams.get("numberOfQuestions") || "1",
    10
  );
  const secondsPerQuestion = parseInt(
    searchParams.get("secondsPerQuestion") || "100",
    10
  );

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [testHistoryId, setTestHistoryId] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(secondsPerQuestion);
  const [isTestComplete, setIsTestComplete] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [submittedAnswers, setSubmittedAnswers] = useState<Set<number>>(
    new Set()
  );

  // Fetch questions on mount
  useEffect(() => {
    let didCancel = false;

    const fetchQuestions = async () => {
      try {
        const response = await fetch("/api/filteredquestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subjectIds: selectedSubjects,
            maxQuestions: numberOfQuestions,
            questionMode,
            userId,
          }),
        });

        const data = await response.json();
        if (!didCancel && Array.isArray(data)) {
          setQuestions(data);
        }
      } catch (error) {
        console.error("Error fetching questions:", error);
      }
    };

    fetchQuestions();

    return () => {
      didCancel = true;
      localStorage.removeItem("timeLeft");
    };
  }, []);

  // Timer logic for timed tests
  useEffect(() => {
    if (isTimed) {
      const timer = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (isAnswered) {
            clearInterval(timer);
            return prevTime;
          }
          if (prevTime <= 1) {
            clearInterval(timer);
            handleAnswerSubmission(); // Automatically submit answer if time runs out
            return secondsPerQuestion;
          }
          return prevTime - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [currentQuestion, secondsPerQuestion, isTimed, isAnswered]);

  // Handle answer submission
  const handleAnswerSubmission = async () => {
    const currentQ = questions[currentQuestion];

    if (submittedAnswers.has(Number(currentQ.id))) return;

    setIsAnswered(true); // Mark question as answered
    const isCorrect = selectedAnswer === currentQ.correctAnswer;
    const answerToSubmit = selectedAnswer !== null ? selectedAnswer : -1;

    // Only create test history on first answer submission
    if (!testHistoryId) {
      console.log("Creating test history for the first answer");
      const historyId = await saveTestResult(
        userId,
        score,
        numberOfQuestions,
        isTimed,
        isTutor,
        questionMode,
        numberOfQuestions
      );

      setTestHistoryId(historyId);
      console.log("Test history created ID:", historyId);
    }

    try {
      const response = await fetch("/api/users-answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          question_id: currentQ.id,
          selected_answer: answerToSubmit,
          is_correct: isCorrect,
          test_history_id: testHistoryId, // Use history ID
        }),
      });

      const data = await response.json();
      setSubmittedAnswers((prev) => new Set(prev).add(Number(currentQ.id)));
      if (isCorrect) setScore((prevScore) => prevScore + 1);
    } catch (error) {
      console.error("Error submitting answer:", error);
    }
  };

  // Handle moving to the next question
  const handleNextQuestion = () => {
    if (currentQuestion === questions.length - 1) {
      setIsTestComplete(true);
      localStorage.removeItem("timeLeft"); // Clear timer when the test is complete

      if (testHistoryId) {
        updateTestResult(
          userId,
          score,
          questions.length,
          isTimed,
          isTutor,
          questionMode,
          numberOfQuestions,
          testHistoryId,
        );
      }

    } else {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    }
  };

  const saveTestResult = async (
    userId: number,
    score: number,
    questions: number,
    timed: boolean,
    tutor: boolean,
    questionMode: string,
    newQuestions: number,
  ): Promise<number | null> => {
    try {
      const response = await fetch("/api/save-test-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          score,
          questions,
          timed,
          tutor,
          questionMode,
          newQuestions,
        }),
      });

      const data = await response.json();
      return data.id || null;
    } catch (error) {
      console.error("Error saving test result:", error);
      return null;
    }
  };

  const updateTestResult = async (
    userId: number,
    score: number,
    questions: number,
    timed: boolean,
    tutor: boolean,
    questionMode: string,
    newQuestions: number,
    testHistoryId: number,
  ): Promise<void> => {
    try {
      const response = await fetch("/api/save-test-results", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          score,
          questions,
          timed,
          tutor,
          questionMode,
          newQuestions,
          testHistoryId,
        }),
      });

      await response.json();
    } catch (error) {
      console.error("Error saving test result:", error);
    }
  };

  const isLastQuestion = currentQuestion === questions.length - 1;

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
  };

  const resultData = [
    { name: "Correct", value: score },
    { name: "Incorrect", value: questions.length - score },
  ];

  if (isTestComplete) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Canadian Bar Exam Practice Test Results
        </h1>
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="text-center">
                Your Score: {score} / {questions.length} (
                {Math.round((score / questions.length) * 100)}%)
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="w-64 h-64 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={resultData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {resultData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex space-x-4">
              <Link href="/dashboard">
                <div className="bg-blue-500 text-white px-4 py-2 rounded">
                  Go to Dashboard
                </div>
              </Link>
              <Link href="/dashboard/newtest">
                <div className="bg-orange-500 text-white px-4 py-2 rounded">
                  Start New Test
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (questions.length === 0) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Canadian Bar Exam Practice Test
      </h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>
              Question {currentQuestion + 1} of {questions.length}
            </span>
            {isTimed && (
              <span className="text-xl font-bold">{formatTime(timeLeft)}</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isTimed && (
            <Progress
              value={(timeLeft / secondsPerQuestion) * 100}
              className="mb-4"
            />
          )}
          <p className="text-lg mb-6">
            {questions[currentQuestion]?.questionText}
          </p>
          <RadioGroup
            value={selectedAnswer?.toString() || ""}
            onValueChange={(value) => setSelectedAnswer(parseInt(value))}
          >
            {["answer1", "answer2", "answer3", "answer4"].map(
              (choice, index) => {
                const answerId = index + 1;
                const correctAnswer = questions[currentQuestion].correctAnswer;
                const isCorrect = answerId === correctAnswer;
                const isSelected = answerId === selectedAnswer;
                const textColorClass =
                  isTutor && isAnswered
                    ? isCorrect
                      ? "text-green-600"
                      : isSelected
                      ? "text-red-600"
                      : "text-gray-900"
                    : "text-gray-900";

                return (
                  <div
                    key={index}
                    className={`flex items-center space-x-2 mb-4 ${textColorClass}`}
                  >
                    <RadioGroupItem
                      value={answerId.toString()}
                      id={`choice-${index}`}
                      className="mt-1"
                    />
                    <Label
                      htmlFor={`choice-${index}`}
                      className="flex-1 cursor-pointer"
                    >
                      {(questions[currentQuestion] as any)[`answer${answerId}`]}
                    </Label>
                    {isTutor && isAnswered && (
                      <div className="ml-2">
                        {isCorrect ? (
                          <CheckCircle className="text-green-600 h-5 w-5" />
                        ) : (
                          isSelected && (
                            <XCircle className="text-red-600 h-5 w-5" />
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </RadioGroup>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button
            onClick={() => {
              if (!isAnswered) {
                handleAnswerSubmission();
              } else {
                handleNextQuestion();
              }
            }}
            disabled={selectedAnswer === null && !isAnswered}
          >
            {isAnswered
              ? isLastQuestion
                ? "Finish"
                : "Next Question"
              : "Submit Answer"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
