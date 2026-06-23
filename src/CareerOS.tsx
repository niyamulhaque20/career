import { useState, useEffect, Dispatch, SetStateAction } from "react";
import { auth, db } from "./firebase";
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Card } from "./components/Card";
import { Badge } from "./components/Badge";
import { ProgressBar } from "./components/ProgressBar";
import { SectionHeader } from "./components/SectionHeader";
import { Button } from "./components/Button";
import { Input } from "./components/Input";
import { Auth } from "./components/Auth";

// Types
type AcademicStage = "Class 11" | "Class 12" | "HSC Candidate" | "University Student";

type CareerGoal = 
  | "Medical Admission"
  | "Engineering Admission"
  | "Embedded Engineer"
  | "AI Engineer"
  | "Robotics Engineer"
  | "VLSI Engineer"
  | "Software Engineer"
  | "Researcher";

type DailyMission = {
  id: string;
  title: string;
  description: string;
  dueDate: number;
  completed: boolean;
  xpReward: number;
  difficulty: "easy" | "medium" | "hard";
  category: string;
};

type WeeklyTask = {
  id: string;
  title: string;
  description: string;
  weekOf: number;
  completed: boolean;
  subtasks: string[];
};

type RoadmapPhase = {
  id: number;
  name: string;
  icon: string;
  color: string;
  duration: string;
  status: "active" | "locked" | "completed";
  why: string;
  careerImpact: number;
  researchImpact: number;
  topics: string[];
  projects: string[];
  resources: { title: string; url: string; type: string }[];
  tasks: string[];
};

type Subject = {
  name: string;
  code: string;
  credit: number;
};

type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

type ReminderItem = {
  id: string;
  label: string;
  dueAt: number;
  triggered: boolean;
};

type PlannerMode = "task" | "goal";

type TaskModeTask = {
  id: string;
  title: string;
  description: string;
  dueDate: number;
  completed: boolean;
  status: "active" | "pending" | "recovery";
};

type GoalModeGoal = {
  id: string;
  title: string;
  startDate: number;
  endDate: number;
  durationDays: number;
  progress: number;
  timeInvestedMinutes: number;
  notes: string;
};

type PlannerState = {
  mode: PlannerMode;
  taskModeTasks: TaskModeTask[];
  goalModeGoals: GoalModeGoal[];
};

type UserProfile = {
  name: string;
  initial: string;
  academicStage: AcademicStage;
  careerGoal: CareerGoal;
  university: string;
  department: string;
  cgpa: number;
  cgpaGoal: number;
};

type AlarmSettings = {
  customUrl: string;
  customName: string;
  durationMs: number;
};

type AppState = {
  xp: number;
  completedToday: number;
  weeklyHours: number;
  streakDays: number;
  phaseProgress: number;
  completedMissions: string[];
  alarmSettings: AlarmSettings;
};

// Default data
const DEFAULT_PROFILE: UserProfile = {
  name: "",
  initial: "U",
  academicStage: "University Student",
  careerGoal: "Software Engineer",
  university: "",
  department: "",
  cgpa: 0,
  cgpaGoal: 0,
};

const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_PLANNER: PlannerState = {
  mode: "task",
  taskModeTasks: [
    {
      id: "physics-ch4",
      title: "Physics Chapter 4",
      description: "Complete chapter 4 theory and example problems.",
      dueDate: Date.now() + DAY_MS,
      completed: false,
      status: "active",
    },
    {
      id: "chemistry-ch5",
      title: "Chemistry Chapter 5",
      description: "Study chapter 5 concepts and practice sample questions.",
      dueDate: Date.now() + DAY_MS * 2,
      completed: false,
      status: "active",
    },
    {
      id: "revision-session",
      title: "Revision",
      description: "Review previous chapters and summarize key formulas.",
      dueDate: Date.now() + DAY_MS * 3,
      completed: false,
      status: "active",
    },
  ],
  goalModeGoals: [
    {
      id: "goal-c-programming",
      title: "C Programming",
      startDate: Date.now(),
      endDate: Date.now() + DAY_MS * 15,
      durationDays: 15,
      progress: 40,
      timeInvestedMinutes: 180,
      notes: "Focus on C syntax, pointers and embedded examples.",
    },
    {
      id: "goal-python",
      title: "Python",
      startDate: Date.now(),
      endDate: Date.now() + DAY_MS * 20,
      durationDays: 20,
      progress: 20,
      timeInvestedMinutes: 120,
      notes: "Work through Python fundamentals and scripts.",
    },
    {
      id: "goal-esp32",
      title: "ESP32",
      startDate: Date.now(),
      endDate: Date.now() + DAY_MS * 30,
      durationDays: 30,
      progress: 10,
      timeInvestedMinutes: 90,
      notes: "Build IoT hands-on sessions with ESP32 modules.",
    },
    {
      id: "goal-stm32",
      title: "STM32",
      startDate: Date.now(),
      endDate: Date.now() + DAY_MS * 30,
      durationDays: 30,
      progress: 5,
      timeInvestedMinutes: 60,
      notes: "Learn STM32 project setup and peripheral programming.",
    },
  ],
};

const DEFAULT_STATE: AppState = {
  xp: 0,
  completedToday: 0,
  weeklyHours: 0,
  streakDays: 0,
  phaseProgress: 0,
  completedMissions: [],
  alarmSettings: {
    customUrl: "",
    customName: "",
    durationMs: 3000,
  },
};

// Career Goal Templates - Each goal has a learning pathway
const CAREER_ROADMAP_TEMPLATES: Record<CareerGoal, RoadmapPhase[]> = {
  "Medical Admission": [
    {
      id: 1,
      name: "Biology Mastery",
      icon: "🧬",
      color: "#EC4899",
      duration: "12 weeks",
      status: "active",
      why: "Build strong fundamentals in Cell Biology, Genetics, and Human Physiology",
      careerImpact: 95,
      researchImpact: 85,
      topics: ["Cell Biology", "Genetics", "Human Physiology", "Ecology"],
      projects: ["Biology experiment documentation", "Ecosystem study"],
      resources: [
        { title: "Biology MCQ Database", url: "https://example.com/bio-mcq", type: "Practice" },
        { title: "Physiology Diagrams", url: "https://example.com/physio", type: "Visual" },
      ],
      tasks: [
        "Study 2 chapters of Biology daily",
        "Solve 50 MCQs from each chapter",
        "Create concept maps for complex topics",
        "Weekly revision of topics covered",
      ],
    },
    {
      id: 2,
      name: "Chemistry Fundamentals",
      icon: "⚗️",
      color: "#F59E0B",
      duration: "10 weeks",
      status: "locked",
      why: "Master Organic, Inorganic, and Physical Chemistry for exam success",
      careerImpact: 85,
      researchImpact: 90,
      topics: ["Organic Chemistry", "Inorganic Chemistry", "Physical Chemistry"],
      projects: ["Chemical reaction documentation", "Balancing equations practice"],
      resources: [
        { title: "Chemistry Tricks", url: "https://example.com/chem-tricks", type: "Guide" },
        { title: "Reaction Sheet", url: "https://example.com/reactions", type: "Reference" },
      ],
      tasks: [
        "Master periodic table trends",
        "Daily organic synthesis practice",
        "Numerical problem solving sessions",
        "Mechanism drawing practice",
      ],
    },
    {
      id: 3,
      name: "Physics Excellence",
      icon: "⚛️",
      color: "#3B82F6",
      duration: "10 weeks",
      status: "locked",
      why: "Develop problem-solving skills in Mechanics, Electricity, and Modern Physics",
      careerImpact: 80,
      researchImpact: 88,
      topics: ["Mechanics", "Electricity & Magnetism", "Modern Physics", "Waves"],
      projects: ["Physics lab experiment reports", "Numericals compilation"],
      resources: [
        { title: "Physics Formula Sheet", url: "https://example.com/formulas", type: "Reference" },
        { title: "Solved Problems", url: "https://example.com/physics-solved", type: "Practice" },
      ],
      tasks: [
        "Daily numerical problem solving",
        "Concept visualization with simulations",
        "Derivation practice",
        "Exam-style problem sets",
      ],
    },
    {
      id: 4,
      name: "Revision & Mock Tests",
      icon: "🧪",
      color: "#10B981",
      duration: "8 weeks",
      status: "locked",
      why: "Consolidate learning and build exam confidence with comprehensive mock tests",
      careerImpact: 92,
      researchImpact: 75,
      topics: ["Integrated topics", "Time management", "Exam strategy"],
      projects: ["Mock test attempts", "Error analysis logs"],
      resources: [
        { title: "Full Mock Tests", url: "https://example.com/mocks", type: "Practice" },
        { title: "Exam Strategy", url: "https://example.com/strategy", type: "Guide" },
      ],
      tasks: [
        "Take weekly full mock tests",
        "Review and analyze mistakes",
        "Targeted revision for weak areas",
        "Daily rapid recall practice",
      ],
    },
  ],
  "Engineering Admission": [
    {
      id: 1,
      name: "Higher Mathematics",
      icon: "📐",
      color: "#7C3AED",
      duration: "14 weeks",
      status: "active",
      why: "Master Calculus, Algebra, Trigonometry, and Geometry for engineering entrance",
      careerImpact: 100,
      researchImpact: 95,
      topics: ["Algebra", "Trigonometry", "Calculus", "Coordinate Geometry"],
      projects: ["Problem set compilation", "Formula derivations"],
      resources: [
        { title: "Math Tricks & Shortcuts", url: "https://example.com/math-tricks", type: "Guide" },
        { title: "Integration Techniques", url: "https://example.com/calculus", type: "Tutorial" },
      ],
      tasks: [
        "Solve 100+ problems daily",
        "Master speed calculation techniques",
        "Daily MCQ practice",
        "Weekly problem-solving contests",
      ],
    },
    {
      id: 2,
      name: "Physics for Engineering",
      icon: "🔬",
      color: "#0891B2",
      duration: "12 weeks",
      status: "locked",
      why: "Build strong physics foundation with emphasis on numerical and conceptual problems",
      careerImpact: 95,
      researchImpact: 92,
      topics: ["Mechanics", "Thermodynamics", "Optics", "Modern Physics"],
      projects: ["Experiment reports", "Physics notes compilation"],
      resources: [
        { title: "Physics Numericals", url: "https://example.com/physics-num", type: "Practice" },
        { title: "Concept Videos", url: "https://example.com/physics-vid", type: "Video" },
      ],
      tasks: [
        "Daily concept review",
        "Numerical problem sets (50/day)",
        "Video learning sessions",
        "Mock test attempts",
      ],
    },
    {
      id: 3,
      name: "Chemistry Foundations",
      icon: "🧪",
      color: "#DC2626",
      duration: "10 weeks",
      status: "locked",
      why: "Understand chemical reactions, bonding, and stoichiometry essential for engineering",
      careerImpact: 85,
      researchImpact: 80,
      topics: ["Atomic Structure", "Bonding", "Reactions", "Electrochemistry"],
      projects: ["Chemical equations practice", "Stoichiometry problems"],
      resources: [
        { title: "Chemistry Cheat Sheet", url: "https://example.com/chem-cheat", type: "Reference" },
        { title: "IUPAC Nomenclature", url: "https://example.com/iupac", type: "Guide" },
      ],
      tasks: [
        "Balanced equation daily practice",
        "Stoichiometry problem solving",
        "MCQ practice 40/day",
        "Conceptual clarity sessions",
      ],
    },
    {
      id: 4,
      name: "ICT & Programming",
      icon: "💻",
      color: "#059669",
      duration: "8 weeks",
      status: "locked",
      why: "Build foundational programming skills and ICT concepts",
      careerImpact: 70,
      researchImpact: 65,
      topics: ["Basic Programming", "Algorithms", "Data Structures"],
      projects: ["Simple programs", "Algorithm implementations"],
      resources: [
        { title: "Programming Basics", url: "https://example.com/prog", type: "Tutorial" },
        { title: "Logic Problems", url: "https://example.com/logic", type: "Practice" },
      ],
      tasks: [
        "Daily coding practice",
        "Algorithm study sessions",
        "Project implementations",
        "Logic problem solving",
      ],
    },
    {
      id: 5,
      name: "Mock Tests & Revision",
      icon: "🎯",
      color: "#EA580C",
      duration: "6 weeks",
      status: "locked",
      why: "Comprehensive review with full-length mock tests and time management practice",
      careerImpact: 98,
      researchImpact: 85,
      topics: ["Integrated preparation", "Exam strategy", "Time management"],
      projects: ["Mock test completion", "Analysis reports"],
      resources: [
        { title: "Full Mock Tests", url: "https://example.com/eng-mocks", type: "Practice" },
        { title: "Exam Strategy Guide", url: "https://example.com/exam-strat", type: "Guide" },
      ],
      tasks: [
        "2 mock tests per week",
        "Error analysis and revision",
        "Speed and accuracy improvement",
        "Final concept review",
      ],
    },
  ],
  "Embedded Engineer": [
    {
      id: 1,
      name: "C Programming Master",
      icon: "💾",
      color: "#2563EB",
      duration: "10 weeks",
      status: "active",
      why: "Master C programming - foundation for embedded systems",
      careerImpact: 95,
      researchImpact: 80,
      topics: ["Variables & Data Types", "Functions", "Pointers", "Memory Management"],
      projects: ["20+ C programs", "Data structure implementation"],
      resources: [
        { title: "C Programming Guide", url: "https://example.com/c-guide", type: "Tutorial" },
        { title: "Pointer Visualizer", url: "https://example.com/pointers", type: "Tool" },
      ],
      tasks: [
        "Code 5-10 programs daily",
        "Master pointers and memory",
        "Implement data structures",
        "Debug challenging code",
      ],
    },
    {
      id: 2,
      name: "Python & Scripting",
      icon: "🐍",
      color: "#FCD34D",
      duration: "6 weeks",
      status: "locked",
      why: "Learn Python for embedded system automation and data processing",
      careerImpact: 80,
      researchImpact: 75,
      topics: ["Python Basics", "Libraries", "File I/O", "Automation"],
      projects: ["Automation scripts", "Data processing tools"],
      resources: [
        { title: "Python Documentation", url: "https://example.com/python", type: "Reference" },
        { title: "PySerial Guide", url: "https://example.com/pyserial", type: "Tutorial" },
      ],
      tasks: [
        "Daily Python coding",
        "Library exploration",
        "Scripting for automation",
        "Integration with hardware",
      ],
    },
    {
      id: 3,
      name: "Microcontroller Fundamentals",
      icon: "🔌",
      color: "#6366F1",
      duration: "8 weeks",
      status: "locked",
      why: "Understand microcontroller architecture and basic interfacing",
      careerImpact: 92,
      researchImpact: 85,
      topics: ["AVR Architecture", "Arduino Basics", "GPIO", "ADC/DAC"],
      projects: ["LED blinking", "Button control", "Simple sensor reading"],
      resources: [
        { title: "AVR Datasheet", url: "https://example.com/avr", type: "Reference" },
        { title: "Arduino IDE Guide", url: "https://example.com/arduino", type: "Tutorial" },
      ],
      tasks: [
        "Daily microcontroller coding",
        "GPIO programming",
        "Interrupt handling",
        "Simple projects weekly",
      ],
    },
    {
      id: 4,
      name: "Communication Protocols",
      icon: "📡",
      color: "#E879F9",
      duration: "8 weeks",
      status: "locked",
      why: "Master UART, I2C, SPI communication protocols",
      careerImpact: 88,
      researchImpact: 88,
      topics: ["UART", "I2C", "SPI", "Protocol Analysis"],
      projects: ["UART communication", "I2C sensor reading", "SPI memory access"],
      resources: [
        { title: "Protocol Tutorials", url: "https://example.com/protocols", type: "Tutorial" },
        { title: "Logic Analyzer Guide", url: "https://example.com/logic", type: "Guide" },
      ],
      tasks: [
        "Study protocol specifications daily",
        "Implement each protocol",
        "Multi-device communication",
        "Protocol debugging",
      ],
    },
    {
      id: 5,
      name: "Advanced MCU (STM32)",
      icon: "🎛️",
      color: "#14B8A6",
      duration: "10 weeks",
      status: "locked",
      why: "Deep dive into STM32 microcontroller programming and peripherals",
      careerImpact: 95,
      researchImpact: 90,
      topics: ["STM32 Architecture", "STM32CubeIDE", "Timers", "DMA"],
      projects: ["PWM control", "Timer interrupts", "DMA transfers"],
      resources: [
        { title: "STM32 Reference Manual", url: "https://example.com/stm32", type: "Reference" },
        { title: "CubeIDE Setup", url: "https://example.com/cubide", type: "Tutorial" },
      ],
      tasks: [
        "STM32 architecture study",
        "CubeIDE configuration",
        "Advanced peripheral programming",
        "Complex project implementation",
      ],
    },
    {
      id: 6,
      name: "Embedded Linux",
      icon: "🐧",
      color: "#F97316",
      duration: "10 weeks",
      status: "locked",
      why: "Learn Linux fundamentals and kernel interaction for embedded systems",
      careerImpact: 90,
      researchImpact: 92,
      topics: ["Linux Basics", "Device Drivers", "Kernel Modules", "System Programming"],
      projects: ["Custom device driver", "Linux modules", "System calls"],
      resources: [
        { title: "Linux Kernel Book", url: "https://example.com/linux", type: "Book" },
        { title: "Driver Development", url: "https://example.com/drivers", type: "Tutorial" },
      ],
      tasks: [
        "Daily Linux command practice",
        "Device driver development",
        "Kernel module programming",
        "System-level debugging",
      ],
    },
    {
      id: 7,
      name: "AI on Edge Devices",
      icon: "🤖",
      color: "#8B5CF6",
      duration: "8 weeks",
      status: "locked",
      why: "Deploy machine learning models on embedded devices",
      careerImpact: 85,
      researchImpact: 95,
      topics: ["TensorFlow Lite", "Model Optimization", "Inference", "Edge AI"],
      projects: ["Image recognition on MCU", "Anomaly detection"],
      resources: [
        { title: "TensorFlow Lite Guide", url: "https://example.com/tflite", type: "Tutorial" },
        { title: "Edge AI Papers", url: "https://example.com/edge-ai", type: "Research" },
      ],
      tasks: [
        "Model quantization practice",
        "TensorFlow Lite deployment",
        "Performance optimization",
        "Edge deployment projects",
      ],
    },
  ],
  "AI Engineer": [
    {
      id: 1,
      name: "Python & Data Science",
      icon: "📊",
      color: "#FCD34D",
      duration: "10 weeks",
      status: "active",
      why: "Master Python and essential data science libraries",
      careerImpact: 95,
      researchImpact: 90,
      topics: ["NumPy", "Pandas", "Matplotlib", "Data Manipulation"],
      projects: ["Data analysis projects", "Dataset cleaning"],
      resources: [
        { title: "NumPy Tutorial", url: "https://example.com/numpy", type: "Tutorial" },
        { title: "Pandas Cookbook", url: "https://example.com/pandas", type: "Guide" },
      ],
      tasks: [
        "Daily Python coding",
        "Data analysis problems",
        "Visualization practice",
        "Real-world datasets",
      ],
    },
    {
      id: 2,
      name: "Machine Learning Foundations",
      icon: "🧠",
      color: "#6366F1",
      duration: "12 weeks",
      status: "locked",
      why: "Learn ML algorithms, training, and evaluation techniques",
      careerImpact: 98,
      researchImpact: 95,
      topics: ["Supervised Learning", "Unsupervised Learning", "Model Evaluation"],
      projects: ["Classification models", "Regression projects"],
      resources: [
        { title: "ML Algorithms", url: "https://example.com/ml-algo", type: "Course" },
        { title: "Scikit-learn Docs", url: "https://example.com/sklearn", type: "Reference" },
      ],
      tasks: [
        "Algorithm study daily",
        "Model implementation",
        "Hyperparameter tuning",
        "Kaggle competitions",
      ],
    },
    {
      id: 3,
      name: "Deep Learning",
      icon: "🧬",
      color: "#EC4899",
      duration: "12 weeks",
      status: "locked",
      why: "Master neural networks, CNNs, RNNs, and transformers",
      careerImpact: 100,
      researchImpact: 98,
      topics: ["Neural Networks", "CNNs", "RNNs", "Transformers"],
      projects: ["Image classification", "Text generation", "Time series"],
      resources: [
        { title: "TensorFlow Guide", url: "https://example.com/tf", type: "Tutorial" },
        { title: "PyTorch Docs", url: "https://example.com/pytorch", type: "Reference" },
      ],
      tasks: [
        "Neural network architecture study",
        "Deep learning implementation",
        "Model training and tuning",
        "Advanced projects",
      ],
    },
    {
      id: 4,
      name: "Computer Vision",
      icon: "👁️",
      color: "#0891B2",
      duration: "10 weeks",
      status: "locked",
      why: "Develop expertise in image processing and computer vision",
      careerImpact: 92,
      researchImpact: 93,
      topics: ["Image Processing", "Object Detection", "Segmentation"],
      projects: ["Object detection model", "Image segmentation"],
      resources: [
        { title: "OpenCV Tutorial", url: "https://example.com/opencv", type: "Tutorial" },
        { title: "YOLO Guide", url: "https://example.com/yolo", type: "Guide" },
      ],
      tasks: [
        "Image processing techniques",
        "CNN for vision",
        "Object detection projects",
        "Real-time processing",
      ],
    },
    {
      id: 5,
      name: "NLP & Language Models",
      icon: "📝",
      color: "#10B981",
      duration: "10 weeks",
      status: "locked",
      why: "Master NLP techniques and large language models",
      careerImpact: 95,
      researchImpact: 97,
      topics: ["Text Processing", "Transformers", "LLMs", "Fine-tuning"],
      projects: ["Sentiment analysis", "Text generation", "LLM applications"],
      resources: [
        { title: "Hugging Face Guide", url: "https://example.com/hf", type: "Tutorial" },
        { title: "Transformer Paper", url: "https://example.com/transformer", type: "Paper" },
      ],
      tasks: [
        "NLP fundamentals daily",
        "Transformer architecture study",
        "Model fine-tuning",
        "LLM integration projects",
      ],
    },
    {
      id: 6,
      name: "Model Deployment & MLOps",
      icon: "🚀",
      color: "#EA580C",
      duration: "8 weeks",
      status: "locked",
      why: "Learn deployment, monitoring, and production ML systems",
      careerImpact: 90,
      researchImpact: 85,
      topics: ["Docker", "Kubernetes", "Model Serving", "CI/CD"],
      projects: ["Deploy ML model", "Setup MLOps pipeline"],
      resources: [
        { title: "Docker Guide", url: "https://example.com/docker", type: "Tutorial" },
        { title: "MLOps Best Practices", url: "https://example.com/mlops", type: "Guide" },
      ],
      tasks: [
        "Docker containerization",
        "Model API creation",
        "Deployment pipelines",
        "Monitoring setup",
      ],
    },
  ],
  "Robotics Engineer": [
    {
      id: 1,
      name: "C++ Programming",
      icon: "⚙️",
      color: "#0EA5E9",
      duration: "10 weeks",
      status: "active",
      why: "Master C++ for robotics software development",
      careerImpact: 95,
      researchImpact: 85,
      topics: ["C++ Basics", "OOP", "STL", "Performance"],
      projects: ["20+ C++ programs", "Data structure implementations"],
      resources: [
        { title: "C++ Reference", url: "https://example.com/cpp-ref", type: "Reference" },
        { title: "Modern C++", url: "https://example.com/cpp-modern", type: "Guide" },
      ],
      tasks: [
        "Daily C++ coding",
        "OOP design patterns",
        "Performance optimization",
        "Complex algorithms",
      ],
    },
    {
      id: 2,
      name: "ROS (Robot Operating System)",
      icon: "🤖",
      color: "#8B5CF6",
      duration: "12 weeks",
      status: "locked",
      why: "Learn ROS for robot development and coordination",
      careerImpact: 98,
      researchImpact: 92,
      topics: ["ROS Architecture", "Nodes & Topics", "Services & Actions"],
      projects: ["ROS robot simulation", "Multi-robot coordination"],
      resources: [
        { title: "ROS Official Docs", url: "https://example.com/ros", type: "Reference" },
        { title: "ROS Tutorials", url: "https://example.com/ros-tut", type: "Tutorial" },
      ],
      tasks: [
        "ROS fundamentals study",
        "Node creation and communication",
        "Simulation environment setup",
        "Complex robot projects",
      ],
    },
    {
      id: 3,
      name: "Kinematics & Dynamics",
      icon: "📐",
      color: "#F59E0B",
      duration: "10 weeks",
      status: "locked",
      why: "Understand robot mechanics and motion planning",
      careerImpact: 90,
      researchImpact: 95,
      topics: ["Forward/Inverse Kinematics", "Dynamics", "Motion Planning"],
      projects: ["Arm kinematics solver", "Path planning algorithm"],
      resources: [
        { title: "Robotics Fundamentals", url: "https://example.com/robotics-fund", type: "Book" },
        { title: "MATLAB/Python Tutorials", url: "https://example.com/robotics-sim", type: "Tutorial" },
      ],
      tasks: [
        "Mathematical foundations daily",
        "Kinematics implementation",
        "Dynamics simulation",
        "Path planning projects",
      ],
    },
    {
      id: 4,
      name: "Robot Perception",
      icon: "👁️",
      color: "#EC4899",
      duration: "10 weeks",
      status: "locked",
      why: "Master vision and sensing for autonomous robots",
      careerImpact: 92,
      researchImpact: 94,
      topics: ["Camera Calibration", "Object Detection", "SLAM"],
      projects: ["Visual servoing", "SLAM implementation"],
      resources: [
        { title: "Computer Vision for Robotics", url: "https://example.com/cv-robot", type: "Course" },
        { title: "OpenCV + ROS", url: "https://example.com/opencv-ros", type: "Guide" },
      ],
      tasks: [
        "Vision algorithm study",
        "SLAM implementation",
        "Sensor integration",
        "Perception projects",
      ],
    },
    {
      id: 5,
      name: "Autonomous Systems",
      icon: "🧭",
      color: "#06B6D4",
      duration: "12 weeks",
      status: "locked",
      why: "Build autonomous navigation and decision-making systems",
      careerImpact: 98,
      researchImpact: 96,
      topics: ["Path Planning", "Navigation", "Decision Making"],
      projects: ["Autonomous navigation", "Multi-robot coordination"],
      resources: [
        { title: "Navigation Stacks", url: "https://example.com/nav", type: "Tutorial" },
        { title: "Autonomous Systems Papers", url: "https://example.com/auto-papers", type: "Research" },
      ],
      tasks: [
        "Autonomy fundamentals",
        "Navigation stack setup",
        "Autonomous projects",
        "Research paper study",
      ],
    },
  ],
  "VLSI Engineer": [
    {
      id: 1,
      name: "Digital Design Fundamentals",
      icon: "🔌",
      color: "#2563EB",
      duration: "10 weeks",
      status: "active",
      why: "Master digital logic and circuit design",
      careerImpact: 95,
      researchImpact: 90,
      topics: ["Digital Logic", "Boolean Algebra", "Combinatorial Circuits"],
      projects: ["Logic circuit designs", "Truth table implementations"],
      resources: [
        { title: "Digital Design Book", url: "https://example.com/dd-book", type: "Book" },
        { title: "Circuit Simulator", url: "https://example.com/simulator", type: "Tool" },
      ],
      tasks: [
        "Daily logic problems",
        "Circuit design practice",
        "Timing analysis",
        "Optimization exercises",
      ],
    },
    {
      id: 2,
      name: "Hardware Description Languages",
      icon: "💻",
      color: "#7C3AED",
      duration: "12 weeks",
      status: "locked",
      why: "Learn Verilog and VHDL for hardware design",
      careerImpact: 98,
      researchImpact: 92,
      topics: ["Verilog Basics", "HDL Synthesis", "Simulation"],
      projects: ["Counter design", "ALU implementation", "Complex modules"],
      resources: [
        { title: "Verilog Tutorial", url: "https://example.com/verilog", type: "Tutorial" },
        { title: "VHDL Guide", url: "https://example.com/vhdl", type: "Guide" },
      ],
      tasks: [
        "Daily HDL coding",
        "Simulation practice",
        "Synthesis optimization",
        "Design projects",
      ],
    },
    {
      id: 3,
      name: "FPGA Development",
      icon: "🧩",
      color: "#0891B2",
      duration: "12 weeks",
      status: "locked",
      why: "Gain hands-on FPGA design experience with Xilinx/Altera",
      careerImpact: 96,
      researchImpact: 93,
      topics: ["FPGA Architecture", "Vivado/Quartus", "Prototyping"],
      projects: ["FPGA designs", "Hardware implementation"],
      resources: [
        { title: "Vivado Tutorial", url: "https://example.com/vivado", type: "Tutorial" },
        { title: "FPGA Design Guide", url: "https://example.com/fpga-guide", type: "Guide" },
      ],
      tasks: [
        "FPGA tool familiarization",
        "Design implementation",
        "Hardware testing",
        "Optimization",
      ],
    },
    {
      id: 4,
      name: "Analog Circuit Design",
      icon: "⚡",
      color: "#DC2626",
      duration: "10 weeks",
      status: "locked",
      why: "Understand analog circuits for mixed-signal VLSI",
      careerImpact: 92,
      researchImpact: 94,
      topics: ["Op-Amps", "Filters", "Amplifiers", "Power Management"],
      projects: ["Circuit analysis", "Layout design"],
      resources: [
        { title: "Analog Design Handbook", url: "https://example.com/analog", type: "Book" },
        { title: "SPICE Simulation", url: "https://example.com/spice", type: "Tool" },
      ],
      tasks: [
        "Circuit analysis daily",
        "Op-amp applications",
        "Filter design",
        "Layout fundamentals",
      ],
    },
    {
      id: 5,
      name: "Physical Design & Layout",
      icon: "📐",
      color: "#EA580C",
      duration: "12 weeks",
      status: "locked",
      why: "Master physical design, placement, and routing",
      careerImpact: 94,
      researchImpact: 92,
      topics: ["Place & Route", "DFM", "Signal Integrity", "Power Distribution"],
      projects: ["Full chip design", "Layout optimization"],
      resources: [
        { title: "Physical Design Guide", url: "https://example.com/pd-guide", type: "Guide" },
        { title: "Cadence Tools Tutorial", url: "https://example.com/cadence", type: "Tutorial" },
      ],
      tasks: [
        "Design rules study",
        "Place and route",
        "DFM verification",
        "Design optimization",
      ],
    },
  ],
  "Software Engineer": [
    {
      id: 1,
      name: "Core Programming",
      icon: "💻",
      color: "#2563EB",
      duration: "8 weeks",
      status: "active",
      why: "Master fundamental programming concepts and best practices",
      careerImpact: 95,
      researchImpact: 85,
      topics: ["Data Structures", "Algorithms", "OOP", "Design Patterns"],
      projects: ["Algorithm implementations", "Design pattern examples"],
      resources: [
        { title: "Algorithm Masterclass", url: "https://example.com/algo", type: "Course" },
        { title: "Data Structures Guide", url: "https://example.com/ds", type: "Guide" },
      ],
      tasks: [
        "Daily coding problems (LeetCode)",
        "Algorithm practice",
        "Design pattern study",
        "Code review practice",
      ],
    },
    {
      id: 2,
      name: "Web Development",
      icon: "🌐",
      color: "#EA580C",
      duration: "10 weeks",
      status: "locked",
      why: "Build full-stack web applications",
      careerImpact: 92,
      researchImpact: 80,
      topics: ["Frontend", "Backend", "Databases", "APIs"],
      projects: ["Full-stack projects", "Real-time applications"],
      resources: [
        { title: "React/Vue Guide", url: "https://example.com/frontend", type: "Tutorial" },
        { title: "Node.js/Django", url: "https://example.com/backend", type: "Tutorial" },
      ],
      tasks: [
        "Daily web development projects",
        "Framework mastery",
        "API design",
        "Database optimization",
      ],
    },
    {
      id: 3,
      name: "Mobile Development",
      icon: "📱",
      color: "#10B981",
      duration: "10 weeks",
      status: "locked",
      why: "Create native and cross-platform mobile applications",
      careerImpact: 88,
      researchImpact: 78,
      topics: ["Mobile UI", "Native APIs", "Performance", "App Publishing"],
      projects: ["Native apps", "Cross-platform apps"],
      resources: [
        { title: "React Native Guide", url: "https://example.com/rn", type: "Tutorial" },
        { title: "Flutter Tutorial", url: "https://example.com/flutter", type: "Tutorial" },
      ],
      tasks: [
        "Mobile app development daily",
        "Platform-specific optimization",
        "App store deployment",
        "Performance tuning",
      ],
    },
    {
      id: 4,
      name: "DevOps & Cloud",
      icon: "☁️",
      color: "#0891B2",
      duration: "8 weeks",
      status: "locked",
      why: "Master deployment, scaling, and cloud infrastructure",
      careerImpact: 90,
      researchImpact: 85,
      topics: ["Docker", "Kubernetes", "AWS/GCP", "CI/CD"],
      projects: ["Container deployment", "Cloud infrastructure"],
      resources: [
        { title: "Docker Mastery", url: "https://example.com/docker-master", type: "Course" },
        { title: "Kubernetes Handbook", url: "https://example.com/k8s", type: "Guide" },
      ],
      tasks: [
        "Daily DevOps practice",
        "Container orchestration",
        "Infrastructure as Code",
        "Monitoring setup",
      ],
    },
    {
      id: 5,
      name: "System Design",
      icon: "🏗️",
      color: "#7C3AED",
      duration: "10 weeks",
      status: "locked",
      why: "Design scalable and reliable systems",
      careerImpact: 98,
      researchImpact: 90,
      topics: ["Scalability", "Database Design", "Caching", "Load Balancing"],
      projects: ["System design", "Architecture planning"],
      resources: [
        { title: "System Design Interview", url: "https://example.com/system-design", type: "Course" },
        { title: "Distributed Systems", url: "https://example.com/dist-sys", type: "Paper" },
      ],
      tasks: [
        "System design problems daily",
        "Architecture study",
        "Trade-off analysis",
        "Real-world case studies",
      ],
    },
  ],
  "Researcher": [
    {
      id: 1,
      name: "Research Fundamentals",
      icon: "📚",
      color: "#7C3AED",
      duration: "8 weeks",
      status: "active",
      why: "Master research methodology and academic writing",
      careerImpact: 90,
      researchImpact: 100,
      topics: ["Literature Review", "Research Design", "Statistics", "Academic Writing"],
      projects: ["Literature survey", "Research proposal"],
      resources: [
        { title: "Research Methods", url: "https://example.com/research-methods", type: "Book" },
        { title: "Paper Writing Guide", url: "https://example.com/writing", type: "Guide" },
      ],
      tasks: [
        "Daily paper reading",
        "Literature summarization",
        "Research question formulation",
        "Writing practice",
      ],
    },
    {
      id: 2,
      name: "Specialized Research Area",
      icon: "🔬",
      color: "#EC4899",
      duration: "16 weeks",
      status: "locked",
      why: "Deep dive into your specific research domain",
      careerImpact: 95,
      researchImpact: 98,
      topics: ["Domain knowledge", "Advanced techniques", "Cutting-edge research"],
      projects: ["Literature review", "Preliminary experiments"],
      resources: [
        { title: "Domain Surveys", url: "https://example.com/surveys", type: "Paper" },
        { title: "Key Researchers", url: "https://example.com/researchers", type: "Reference" },
      ],
      tasks: [
        "Paper reading (5+/week)",
        "Domain expertise building",
        "Methodology study",
        "Experiment design",
      ],
    },
    {
      id: 3,
      name: "Research Implementation",
      icon: "🧪",
      color: "#10B981",
      duration: "16 weeks",
      status: "locked",
      why: "Conduct experiments and implement research ideas",
      careerImpact: 92,
      researchImpact: 96,
      topics: ["Experiment Design", "Data Collection", "Analysis"],
      projects: ["Research experiments", "Data analysis"],
      resources: [
        { title: "Experimental Design", url: "https://example.com/exp-design", type: "Guide" },
        { title: "Data Analysis Tools", url: "https://example.com/data-tools", type: "Tutorial" },
      ],
      tasks: [
        "Experiment execution",
        "Data collection",
        "Statistical analysis",
        "Result interpretation",
      ],
    },
    {
      id: 4,
      name: "Publication & Dissemination",
      icon: "📝",
      color: "#0891B2",
      duration: "12 weeks",
      status: "locked",
      why: "Write papers and present research findings",
      careerImpact: 85,
      researchImpact: 95,
      topics: ["Paper Writing", "Figures & Tables", "Presentation", "Peer Review"],
      projects: ["Research paper", "Conference presentation"],
      resources: [
        { title: "Paper Writing Workshop", url: "https://example.com/paper-workshop", type: "Course" },
        { title: "Presentation Tips", url: "https://example.com/present", type: "Guide" },
      ],
      tasks: [
        "Paper drafting",
        "Figure creation",
        "Peer feedback incorporation",
        "Conference submission",
      ],
    },
  ],
};

// Generate daily missions based on profile and the current roadmap phase
function generateDailyMissionsForPhase(phase: RoadmapPhase | null, profile: UserProfile, dayIndex: number): DailyMission[] {
  const topics = phase?.topics?.length ? phase.topics : [profile.careerGoal];
  const topic = topics[dayIndex % topics.length];
  const phaseLabel = phase ? `${phase.name} phase` : `${profile.careerGoal}`;
  const difficultyMap: Record<AcademicStage, DailyMission['difficulty']> = {
    "Class 11": "easy",
    "Class 12": "medium",
    "HSC Candidate": "hard",
    "University Student": "hard",
  };
  const difficulty = difficultyMap[profile.academicStage];
  const baseXP = difficulty === "easy" ? 10 : difficulty === "medium" ? 15 : 20;
  const dueDate = Date.now() + dayIndex * 24 * 60 * 60 * 1000;

  return [
    {
      id: `${phase?.id ?? "profile"}-study-${dayIndex}`,
      title: `Study: ${topic}`,
      description: `Focus on ${topic} for the ${phaseLabel}, aligned with your ${profile.academicStage} goals and your path toward ${profile.careerGoal}.`,
      dueDate,
      completed: false,
      xpReward: baseXP,
      difficulty,
      category: "Study",
    },
    {
      id: `${phase?.id ?? "profile"}-practice-${dayIndex}`,
      title: `Practice: Apply ${topic}`,
      description: `Use a short practice session to apply ${topic} knowledge and build confidence toward ${profile.careerGoal}.`,
      dueDate,
      completed: false,
      xpReward: baseXP + 5,
      difficulty,
      category: "Practice",
    },
    {
      id: `${phase?.id ?? "profile"}-plan-${dayIndex}`,
      title: `Plan: Next step for ${profile.careerGoal}`,
      description: `Outline a clear next step for ${profile.careerGoal} and schedule it for today based on your ${profile.academicStage} priorities.`,
      dueDate,
      completed: false,
      xpReward: baseXP + 10,
      difficulty,
      category: "Planning",
    },
  ];
}

// Create roadmap for career goal
function createRoadmapForProfile(profile: UserProfile): RoadmapPhase[] {
  return CAREER_ROADMAP_TEMPLATES[profile.careerGoal] || [];
}

// Generate today's missions
function getTodaysMissions(roadmap: RoadmapPhase[], profile: UserProfile): DailyMission[] {
  return [];
}


const LEVELS = [
  { level: 1, name: "Starter Engineer", xpRequired: 0 },
  { level: 2, name: "Explorer", xpRequired: 200 },
  { level: 3, name: "Builder", xpRequired: 500 },
  { level: 4, name: "Master", xpRequired: 1000 },
];

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "⚡" },
  { id: "planner", label: "Planner", icon: "🧠" },
  { id: "roadmap", label: "Roadmap", icon: "🗺️" },
  { id: "academic", label: "Academic", icon: "🎓" },
  { id: "studyjebu", label: "StudyJebu", icon: "🚀" },
  { id: "timer", label: "Timer", icon: "⏱️" },
  { id: "reminders", label: "Reminders", icon: "🔔" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

// Play a short alarm using WebAudio (works without external files)
// Accept optional notification title/body to show when alarm plays
async function playAlarm(settings: AlarmSettings = DEFAULT_STATE.alarmSettings, title?: string, body?: string) {
  const durationMs = settings.durationMs || 2000;
  const audioSrc = settings.customUrl?.trim() || "/alarm.mp3";

  // First try a custom audio file from the configured path
  try {
    const audio = new Audio(audioSrc);
    audio.loop = false;
    audio.volume = 0.9;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        setTimeout(() => {
          try { audio.pause(); audio.currentTime = 0; } catch (e) {}
        }, durationMs);
      }).catch(() => {
        // If playback blocked or fails, fallback to WebAudio
        try { playAlarmFallback(durationMs); } catch (e) {}
      });
    }
    // Show notification if requested
    try {
      if (typeof Notification !== "undefined") {
        if (Notification.permission === "default") await Notification.requestPermission();
        if (Notification.permission === "granted" && (title || body)) {
          new Notification(title || "Alarm", { body: body || "" });
        }
      }
      if (navigator && (navigator as any).vibrate) {
        try { (navigator as any).vibrate(300); } catch (e) {}
      }
    } catch (e) {}
    return;
  } catch (e) {
    // ignore and fallback
  }

  // Fallback if audio file isn't available or playback failed
  try {
    playAlarmFallback(durationMs);
    try {
      if (typeof Notification !== "undefined") {
        if (Notification.permission === "default") await Notification.requestPermission();
        if (Notification.permission === "granted" && (title || body)) {
          new Notification(title || "Alarm", { body: body || "" });
        }
      }
      if (navigator && (navigator as any).vibrate) {
        try { (navigator as any).vibrate(300); } catch (e) {}
      }
    } catch (e) {}
  } catch (e) {
    // ignore
  }
}

function playAlarmFallback(durationMs = 2000) {
  const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(880, ctx.currentTime);
  g.gain.setValueAtTime(0.0001, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
  o.connect(g);
  g.connect(ctx.destination);
  o.start();
  setTimeout(() => {
    try {
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.02);
      o.stop(ctx.currentTime + 0.05);
      ctx.close();
    } catch (e) {
      // ignore
    }
  }, durationMs);
}

// Helper function
function getLevelInfo(xp: number) {
  let currentLevel = LEVELS[0];
  let nextLevel = LEVELS[1];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpRequired) {
      currentLevel = LEVELS[i];
      nextLevel = LEVELS[i + 1] || null;
      break;
    }
  }
  const progress = nextLevel
    ? ((xp - currentLevel.xpRequired) / (nextLevel.xpRequired - currentLevel.xpRequired)) * 100
    : 100;
  return { currentLevel, nextLevel, progress: Math.min(progress, 100) };
}

export default function CareerOS() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [active, setActive] = useState("dashboard");

  // Data state
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [appState, setAppState] = useState<AppState>(DEFAULT_STATE);
  const [roadmap, setRoadmap] = useState<RoadmapPhase[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [planner, setPlanner] = useState<PlannerState>(DEFAULT_PLANNER);
  const [showXPToast, setShowXPToast] = useState(false);
  const [xpToShow, setXpToShow] = useState(0);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setDataLoaded(false);
      if (currentUser) {
        await loadUserData(currentUser.uid);
        setDataLoaded(true);
      } else {
        setDataLoaded(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Load data from Firestore
  const loadUserData = async (uid: string) => {
    try {
      // Load profile
      const profileDoc = await getDoc(doc(db, "users", uid));
      if (profileDoc.exists()) {
        const data = profileDoc.data();
        const loadedProfile = data.profile ? { ...DEFAULT_PROFILE, ...data.profile } : DEFAULT_PROFILE;
        setProfile(loadedProfile);
        setAppState(data.state || DEFAULT_STATE);
        const loadedRoadmap = data.roadmap?.length ? data.roadmap : []; // Do not inject demo templates automatically
        setRoadmap(loadedRoadmap);
        setSubjects(data.subjects || []);
        setChecklist(data.checklist || []);
        setReminders(data.reminders || []);
        setPlanner(data.planner ? { ...DEFAULT_PLANNER, ...data.planner } : DEFAULT_PLANNER);
        setAppState(data.state ? { ...DEFAULT_STATE, ...data.state } : DEFAULT_STATE);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  // Save data to Firestore
  const saveUserData = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid), {
        profile,
        state: appState,
        roadmap,
        subjects,
        checklist,
        reminders,
        planner,
        updatedAt: new Date(),
      }, { merge: true });
    } catch (error) {
      console.error("Error saving data:", error);
    }
  };

  // Save whenever data changes, but only after initial user data loads
  useEffect(() => {
    if (user && dataLoaded) {
      saveUserData();
    }
  }, [profile, appState, roadmap, subjects, checklist, reminders, planner, user, dataLoaded]);

  const handleSignOut = () => signOut(auth);

  const requestNotificationPermission = async () => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
  };

  const notifyUser = (title: string, body: string) => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") {
      new Notification(title, { body });
    }
  };

  const scheduleReminder = (label: string, delayMinutes: number, category: "academic" | "roadmap") => {
    const dueAt = Date.now() + delayMinutes * 60 * 1000;
    const reminder: ReminderItem = {
      id: Date.now().toString(),
      label: `${category === "academic" ? "Academic" : "Roadmap"}: ${label}`,
      dueAt,
      triggered: false,
    };
    setReminders(prev => [reminder, ...prev]);
    // Ensure we have permission first, then notify
    requestNotificationPermission();
    notifyUser("Reminder scheduled", `${reminder.label} in ${delayMinutes} minutes`);
  };

  const handleAddXP = (amount: number) => {
    setAppState(prev => ({ ...prev, xp: prev.xp + amount }));
    setXpToShow(amount);
    setShowXPToast(true);
  };

  // If loading, show nothing
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-transparent">
        Loading...
      </div>
    );
  }

  // If not logged in, show Auth
  if (!user) {
    return <Auth />;
  }

  // Render pages
  const renderPage = () => {
    switch (active) {
      case "dashboard":
        return <Dashboard state={appState} profile={profile} roadmap={roadmap} onAddXP={handleAddXP} />;
      case "planner":
        return <Planner planner={planner} setPlanner={setPlanner} onAddXP={handleAddXP} />;
      case "roadmap":
        return <Roadmap roadmap={roadmap} setRoadmap={setRoadmap} profile={profile} onAddXP={handleAddXP} onScheduleReminder={(label) => scheduleReminder(label, 60, "roadmap")} />;
      case "academic":
        return <Academic subjects={subjects} setSubjects={setSubjects} onScheduleReminder={(label) => scheduleReminder(label, 45, "academic")} />;
      case "studyjebu":
        return <StudyJebu checklist={checklist} setChecklist={setChecklist} />;
      case "reminders":
        return <RemindersSegment reminders={reminders} setReminders={setReminders} alarmSettings={appState.alarmSettings} />;
      case "timer":
        return <TimerSegment alarmSettings={appState.alarmSettings} />;
      case "settings":
        return <Settings profile={profile} setProfile={setProfile} setRoadmap={setRoadmap} state={appState} setState={setAppState} onSignOut={handleSignOut} />;
      default:
        return null;
    }
  };

  const levelInfo = getLevelInfo(appState.xp);
  const level = { ...levelInfo.currentLevel, nextLevel: levelInfo.nextLevel };

  return (
    <div className="app-shell flex min-h-screen flex-col md:flex-row overflow-hidden">
      <Sidebar 
        active={active} 
        setActive={setActive} 
        xp={appState.xp} 
        level={level} 
        profile={profile} 
      />
      <main className="app-main bg-transparent">
        {renderPage()}
      </main>
      {showXPToast && (
        <div className="fixed top-6 right-6 z-50">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-[0_18px_60px_rgba(124,106,247,0.18)] backdrop-blur-xl">
            <span className="text-[#F472B6] text-xl">✨</span>
            <span className="font-mono text-[#7C6AF7] font-semibold">+{xpToShow} XP</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Sidebar
function Sidebar({ 
  active, setActive, xp, level, profile 
}: { 
  active: string; setActive: (id: string) => void; 
  xp: number; level: any; profile: UserProfile;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <aside className={`flex ${collapsed ? "w-full md:w-20" : "w-full md:w-64"} flex-col sidebar-shell transition-all duration-300 shrink-0`}>
      <div className="sidebar-header flex items-center justify-between px-5 py-5">
        {!collapsed && (
          <div>
            <span className="text-[#7C6AF7] font-bold text-xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Career<span className="text-white">OS</span></span>
            <p className="text-[10px] subtle font-mono">v1.0</p>
          </div>
        )}
        <button onClick={() => setCollapsed(c => !c)} className="text-[#94A3B8] hover:text-white text-lg">
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      {!collapsed && (
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#7C6AF7] to-[#F472B6] flex items-center justify-center text-white text-sm font-bold">{profile.initial || "U"}</div>
            <div>
              <p className="text-sm font-semibold text-white">{profile.name || "Learner"}</p>
              <p className="text-[10px] subtle">{profile.academicStage} · {level.name}</p>
            </div>
          </div>
          <div className="mt-4">
            {profile.careerGoal && <p className="text-[10px] subtle mt-2">Goal: {profile.careerGoal}</p>}
            <ProgressBar value={xp} max={level.nextLevel?.xpRequired || xp} color="#7C6AF7" height={4} />
            <p className="text-[10px] subtle mt-2 font-mono">{xp} XP · Lv {level.level}</p>
          </div>
        </div>
      )}

      <nav className="flex-1 py-4 overflow-x-auto md:overflow-y-auto flex flex-row md:flex-col gap-2 px-2">
        {NAV_ITEMS.map(item => (
          <button key={item.id} onClick={() => setActive(item.id)}
            className={`nav-pill min-w-[8rem] md:w-full flex items-center gap-3 px-4 py-3 text-left ${collapsed ? "justify-center" : ""} ${active === item.id ? "active" : "text-[#94A3B8]"}`}>
            <span className="text-base">{item.icon}</span>
            {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
}

// Dashboard
function Dashboard({ 
  state, profile, roadmap, onAddXP 
}: { 
  state: AppState; profile: UserProfile; roadmap: RoadmapPhase[]; onAddXP: (amount: number) => void;
}) {
  const levelInfo = getLevelInfo(state.xp);
  const currentPhase = roadmap.find(p => p.status === "active") || roadmap[0];

  return (
    <div className="p-6 space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#12121A] to-[#1E1E2E] border border-[#7C6AF7]33 p-6">
        <div className="relative z-10 flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-[#7C6AF7] text-xs font-mono uppercase tracking-widest">Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 17 ? "Afternoon" : "Evening"}</p>
            <h1 className="text-2xl font-bold text-white mt-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {profile.name || "Learner"} — Welcome back! 🧠
            </h1>
            {profile.careerGoal && <p className="text-sm subtle mt-2">Building a roadmap for {profile.careerGoal}</p>}
          </div>
          <div className="text-right">
            <p className="subtle text-xs font-mono">CURRENT LEVEL</p>
            <p className="text-[#7C6AF7] font-bold text-lg">{levelInfo.currentLevel.name}</p>
            <p className="text-white font-mono text-2xl font-bold">{state.xp.toLocaleString()} <span className="subtle text-sm">XP</span></p>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs subtle mb-1">
            <span>Level {levelInfo.currentLevel.level}</span>
            {levelInfo.nextLevel && <span>Level {levelInfo.nextLevel.level} — {levelInfo.nextLevel.xpRequired.toLocaleString()} XP</span>}
          </div>
          <ProgressBar value={levelInfo.progress} max={100} color="#7C6AF7" height={8} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="CGPA Goal" value={`${profile.cgpaGoal}+`} sub={`Current: ${profile.cgpa}`} icon="📈" color="#22D3EE" />
        <StatCard label="Streak" value={`${state.streakDays}d`} sub="Keep going!" icon="🔥" color="#F472B6" />
        <StatCard label="This Week" value={`${state.weeklyHours}h`} sub="Logged" icon="⏳" color="#34D399" />
        <StatCard label="Phases" value={`${roadmap.filter(p => p.status === "completed").length}/${roadmap.length}`} sub="Completed" icon="✔️" color="#7C6AF7" />
      </div>


      {currentPhase && (
        <Card glow>
          <SectionHeader title="Current Phase" sub={`You're on Phase ${currentPhase.id}`} />
          <div className="p-4 rounded-xl" style={{ background: "linear-gradient(135deg, #7C6AF711, transparent)" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: currentPhase.color + "22", border: `1px solid ${currentPhase.color}44` }}>
                {currentPhase.icon}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{currentPhase.name}</h3>
                <p className="text-xs subtle">{currentPhase.duration}</p>
              </div>
            </div>
            <p className="subtle text-sm mb-3">{currentPhase.why}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="text-center p-2 rounded-2xl glass">
                <p className="text-xs subtle">Career Impact</p>
                <p className="text-lg font-bold text-[#22D3EE]">{currentPhase.careerImpact}%</p>
              </div>
              <div className="text-center p-2 rounded-2xl glass">
                <p className="text-xs subtle">Research Impact</p>
                <p className="text-lg font-bold text-[#F472B6]">{currentPhase.researchImpact}%</p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, icon, color = "#7C6AF7" }: { 
  label: string; value: string | number; sub?: string; icon: string; color?: string;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="form-label uppercase tracking-widest">{label}</p>
          <p className="text-2xl font-bold mt-1" style={{ color, fontFamily: "'Space Grotesk', sans-serif" }}>{value}</p>
          {sub && <p className="subtle text-xs mt-0.5">{sub}</p>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </Card>
  );
}

function formatDateString(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function calculateDaysLeft(endDate: number) {
  return Math.max(0, Math.ceil((endDate - Date.now()) / DAY_MS));
}

function calculateSuggestedMinutes(goal: GoalModeGoal) {
  const daysLeft = calculateDaysLeft(goal.endDate);
  if (daysLeft <= 0) return 30;
  const remainingMinutes = Math.max(0, goal.durationDays * 60 - goal.timeInvestedMinutes);
  return Math.max(30, Math.ceil(remainingMinutes / daysLeft));
}

function Planner({ 
  planner, setPlanner, onAddXP }: { planner: PlannerState; setPlanner: Dispatch<SetStateAction<PlannerState>>; onAddXP: (amount: number) => void;
}) {
  const [taskForm, setTaskForm] = useState({ title: "", description: "", dueDate: "", status: "active" as TaskModeTask["status"] });
  const [goalForm, setGoalForm] = useState({ title: "", startDate: "", endDate: "", progress: "0", timeInvestedMinutes: "0", notes: "" });

  const handleModeChange = (mode: PlannerMode) => {
    setPlanner({ ...planner, mode });
  };

  const addTask = () => {
    if (!taskForm.title.trim() || !taskForm.dueDate) return;
    const newTask: TaskModeTask = {
      id: `task-${Date.now()}`,
      title: taskForm.title.trim(),
      description: taskForm.description.trim() || "Daily study task",
      dueDate: new Date(taskForm.dueDate).getTime(),
      completed: false,
      status: taskForm.status,
    };
    setPlanner(prev => ({ ...prev, taskModeTasks: [newTask, ...prev.taskModeTasks] }));
    setTaskForm({ title: "", description: "", dueDate: "", status: "active" });
  };

  const addGoal = () => {
    if (!goalForm.title.trim() || !goalForm.startDate || !goalForm.endDate) return;
    const start = new Date(goalForm.startDate).getTime();
    const end = new Date(goalForm.endDate).getTime();
    if (end <= start) return;
    const durationDays = Math.max(1, Math.ceil((end - start) / DAY_MS));
    const newGoal: GoalModeGoal = {
      id: `goal-${Date.now()}`,
      title: goalForm.title.trim(),
      startDate: start,
      endDate: end,
      durationDays,
      progress: Number(goalForm.progress) || 0,
      timeInvestedMinutes: Number(goalForm.timeInvestedMinutes) || 0,
      notes: goalForm.notes.trim(),
    };
    setPlanner(prev => ({ ...prev, goalModeGoals: [newGoal, ...prev.goalModeGoals] }));
    setGoalForm({ title: "", startDate: "", endDate: "", progress: "0", timeInvestedMinutes: "0", notes: "" });
  };

  const toggleTaskCompletion = (id: string) => {
    setPlanner(prev => ({
      ...prev,
      taskModeTasks: prev.taskModeTasks.map(task => task.id === id ? { ...task, completed: !task.completed } : task),
    }));
    onAddXP(10);
  };

  const updateTaskStatus = (id: string, status: TaskModeTask["status"]) => {
    setPlanner(prev => ({
      ...prev,
      taskModeTasks: prev.taskModeTasks.map(task => task.id === id ? { ...task, status } : task),
    }));
  };

  const updateGoalProgress = (id: string, changes: Partial<GoalModeGoal>) => {
    setPlanner(prev => ({
      ...prev,
      goalModeGoals: prev.goalModeGoals.map(goal => goal.id === id ? { ...goal, ...changes } : goal),
    }));
  };

  const deleteTask = (id: string) => {
    setPlanner(prev => ({ ...prev, taskModeTasks: prev.taskModeTasks.filter(task => task.id !== id) }));
  };

  const deleteGoal = (id: string) => {
    setPlanner(prev => ({ ...prev, goalModeGoals: prev.goalModeGoals.filter(goal => goal.id !== id) }));
  };

  const activeTasks = planner.taskModeTasks.filter(task => task.status === "active");
  const pendingTasks = planner.taskModeTasks.filter(task => task.status === "pending");
  const recoveryTasks = planner.taskModeTasks.filter(task => task.status === "recovery");

  return (
    <div className="p-6 space-y-6">
      <SectionHeader
        title="Planner"
        sub="Task Mode and Goal Mode for every study path"
        action={(
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => handleModeChange("task")} className={planner.mode === "task" ? "bg-[#7C6AF7]" : ""}>Task Mode</Button>
            <Button onClick={() => handleModeChange("goal")} className={planner.mode === "goal" ? "bg-[#7C6AF7]" : ""}>Goal Mode</Button>
          </div>
        )}
      />

      {planner.mode === "task" ? (
        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-bold text-white mb-4">Task Mode</h3>
            <p className="subtle text-sm mb-4">Designed for HSC students and exam preparation with deadlines, pending tasks and recovery queue.</p>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <label className="form-label mb-1 block">Task title</label>
                <Input value={taskForm.title} onChange={v => setTaskForm({ ...taskForm, title: v })} placeholder="Physics Chapter 4" />
              </div>
              <div>
                <label className="form-label mb-1 block">Description</label>
                <Input value={taskForm.description} onChange={v => setTaskForm({ ...taskForm, description: v })} placeholder="Complete practice questions" />
              </div>
              <div>
                <label className="form-label mb-1 block">Due date</label>
                <Input type="date" value={taskForm.dueDate} onChange={v => setTaskForm({ ...taskForm, dueDate: v })} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <div>
                <label className="form-label mb-1 block">Status</label>
                <select value={taskForm.status} onChange={e => setTaskForm({ ...taskForm, status: e.target.value as any })} className="w-full fancy-input focus:border-transparent focus:ring-2 focus:ring-[rgba(124,106,247,0.18)]">
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="recovery">Recovery</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button onClick={addTask} className="w-full">Add Task</Button>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <TaskSection title="Daily Tasks" tasks={activeTasks} emptyMessage="No active tasks. Add one to stay on track." onToggleComplete={toggleTaskCompletion} onUpdateStatus={updateTaskStatus} onDelete={deleteTask} />
            <TaskSection title="Pending Tasks" tasks={pendingTasks} emptyMessage="Pending tasks need extra attention." onToggleComplete={toggleTaskCompletion} onUpdateStatus={updateTaskStatus} onDelete={deleteTask} />
            <TaskSection title="Recovery Queue" tasks={recoveryTasks} emptyMessage="Recovery queue holds tasks you can catch up on." onToggleComplete={toggleTaskCompletion} onUpdateStatus={updateTaskStatus} onDelete={deleteTask} showStatusActions={false} />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-bold text-white mb-4">Goal Mode</h3>
            <p className="subtle text-sm mb-4">Designed for university learners, skill building, and career roadmaps with progress tracking and daily suggested sessions.</p>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <label className="form-label mb-1 block">Goal title</label>
                <Input value={goalForm.title} onChange={v => setGoalForm({ ...goalForm, title: v })} placeholder="C Programming" />
              </div>
              <div>
                <label className="form-label mb-1 block">Start date</label>
                <Input type="date" value={goalForm.startDate} onChange={v => setGoalForm({ ...goalForm, startDate: v })} />
              </div>
              <div>
                <label className="form-label mb-1 block">End date</label>
                <Input type="date" value={goalForm.endDate} onChange={v => setGoalForm({ ...goalForm, endDate: v })} />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="form-label mb-1 block">Progress (%)</label>
                <Input type="number" min="0" max="100" value={goalForm.progress} onChange={v => setGoalForm({ ...goalForm, progress: v })} />
              </div>
              <div>
                <label className="form-label mb-1 block">Time invested (minutes)</label>
                <Input type="number" min="0" value={goalForm.timeInvestedMinutes} onChange={v => setGoalForm({ ...goalForm, timeInvestedMinutes: v })} />
              </div>
              <div className="flex items-end">
                <Button onClick={addGoal} className="w-full">Add Goal</Button>
              </div>
            </div>
            <div className="mt-4">
              <label className="form-label mb-1 block">Notes</label>
              <input value={goalForm.notes} onChange={e => setGoalForm({ ...goalForm, notes: e.target.value })} placeholder="Focus on pointers and embedded examples" className="w-full fancy-input text-sm" />
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {planner.goalModeGoals.map(goal => {
              const daysLeft = calculateDaysLeft(goal.endDate);
              const suggestedMins = calculateSuggestedMinutes(goal);
              return (
                <Card key={goal.id} glow>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-white">{goal.title}</h3>
                      <p className="subtle text-sm">{formatDateString(goal.startDate)} → {formatDateString(goal.endDate)}</p>
                    </div>
                    <button onClick={() => deleteGoal(goal.id)} className="text-[#F87171] hover:text-white text-sm">Delete</button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs subtle mb-2">
                        <span>Progress</span>
                        <span>{goal.progress}%</span>
                      </div>
                      <ProgressBar value={goal.progress} max={100} color="#34D399" height={8} />
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-2xl glass p-3">
                        <p className="subtle text-xs">Days Left</p>
                        <p className="text-white font-semibold mt-1">{daysLeft}</p>
                      </div>
                      <div className="rounded-2xl glass p-3">
                        <p className="subtle text-xs">Time Invested</p>
                        <p className="text-white font-semibold mt-1">{goal.timeInvestedMinutes} min</p>
                      </div>
                    </div>
                    <div className="rounded-2xl glass p-3">
                      <p className="subtle text-xs">Suggested Daily Study</p>
                      <p className="text-white font-semibold mt-1">{suggestedMins} minutes</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="form-label mb-1 block">Update progress</label>
                        <Input type="number" min="0" max="100" value={String(goal.progress)} onChange={v => updateGoalProgress(goal.id, { progress: Math.max(0, Math.min(100, Number(v))) })} />
                      </div>
                      <div>
                        <label className="form-label mb-1 block">Add minutes</label>
                        <Input type="number" min="0" value={String(goal.timeInvestedMinutes)} onChange={v => updateGoalProgress(goal.id, { timeInvestedMinutes: Number(v) })} />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm subtle">{goal.notes}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TaskSection({
  title,
  tasks,
  emptyMessage,
  onToggleComplete,
  onUpdateStatus,
  onDelete,
  showStatusActions = true,
}: {
  title: string;
  tasks: TaskModeTask[];
  emptyMessage: string;
  onToggleComplete: (id: string) => void;
  onUpdateStatus: (id: string, status: TaskModeTask["status"]) => void;
  onDelete: (id: string) => void;
  showStatusActions?: boolean;
}) {
  return (
    <Card>
      <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
      {tasks.length === 0 ? (
        <p className="subtle text-sm">{emptyMessage}</p>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => (
            <div key={task.id} className="rounded-2xl glass p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <button onClick={() => onToggleComplete(task.id)} className={`w-6 h-6 rounded border flex items-center justify-center ${task.completed ? "bg-[#34D399] border-[#34D399]" : "border-[#475569] hover:border-[#7C6AF7]"}`}>
                      {task.completed && <span className="text-white text-xs">✓</span>}
                    </button>
                    <h4 className={`text-sm font-semibold ${task.completed ? "line-through text-[#94A3B8]" : "text-white"}`}>{task.title}</h4>
                  </div>
                  <p className="text-xs subtle mb-2">Due {formatDateString(task.dueDate)}</p>
                  <p className="text-sm subtle">{task.description}</p>
                </div>
                <div className="text-right space-y-2">
                  {showStatusActions && (
                    <select value={task.status} onChange={e => onUpdateStatus(task.id, e.target.value as TaskModeTask["status"])} className="fancy-input text-xs text-white bg-[#111827] border border-[#374151]">
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="recovery">Recovery</option>
                    </select>
                  )}
                  <button onClick={() => onDelete(task.id)} className="text-[#F87171] hover:text-white text-xs">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// Roadmap
function Roadmap({ 
  roadmap, setRoadmap, profile, onAddXP, onScheduleReminder 
}: { roadmap: RoadmapPhase[]; setRoadmap: (v: RoadmapPhase[]) => void; profile: UserProfile; onAddXP: (amount: number) => void; onScheduleReminder: (label: string) => void;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState<RoadmapPhase | null>(null);
  const [formData, setFormData] = useState<{ 
    name: string;
    icon: string;
    color: string;
    duration: string;
    status: RoadmapPhase["status"];
    why: string;
    careerImpact: number;
    researchImpact: number;
    topics: string;
    projects: string;
    resources: string;
    tasks: string;
  }>({
    name: "", icon: "⭐", color: "#7C6AF7", duration: "4 weeks", status: "locked",
    why: "", careerImpact: 50, researchImpact: 50, topics: "", projects: "", resources: "", tasks: ""
  });

  const handleAddPhase = () => {
    setEditingPhase(null);
    setFormData({
      name: "", icon: "⭐", color: "#7C6AF7", duration: "4 weeks", status: "locked",
      why: "", careerImpact: 50, researchImpact: 50, topics: "", projects: "", resources: "", tasks: ""
    });
    setIsModalOpen(true);
  };

  const handleEditPhase = (phase: RoadmapPhase) => {
    setEditingPhase(phase);
    setFormData({
      name: phase.name, icon: phase.icon, color: phase.color, duration: phase.duration, status: phase.status,
      why: phase.why, careerImpact: phase.careerImpact, researchImpact: phase.researchImpact,
      topics: phase.topics.join(", "), projects: phase.projects.join(", "),
      resources: phase.resources.map(r => `${r.title}|${r.url}|${r.type}`).join("\n"),
      tasks: phase.tasks.join("\n")
    });
    setIsModalOpen(true);
  };

  const handleSavePhase = () => {
    const newPhase: RoadmapPhase = {
      id: editingPhase ? editingPhase.id : Date.now(),
      ...formData,
      topics: formData.topics.split(",").map(t => t.trim()).filter(Boolean),
      projects: formData.projects.split(",").map(p => p.trim()).filter(Boolean),
      tasks: formData.tasks.split("\n").map(t => t.trim()).filter(Boolean),
      resources: formData.resources.split("\n").map(line => {
        const [title, url, type] = line.split("|").map(s => s.trim());
        return title && url ? { title, url, type: type || "Resource" } : null;
      }).filter(Boolean) as { title: string; url: string; type: string }[]
    };

    if (editingPhase) {
      setRoadmap(roadmap.map(p => p.id === editingPhase.id ? newPhase : p));
    } else {
      setRoadmap([...roadmap, newPhase].sort((a, b) => a.id - b.id));
    }
    onScheduleReminder(newPhase.name);
    setIsModalOpen(false);
  };

  const handleDeletePhase = (id: number) => {
    if (confirm("Are you sure you want to delete this phase?")) {
      setRoadmap(roadmap.filter(p => p.id !== id));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <SectionHeader 
        title="Career Roadmap" 
        sub={`${roadmap.length} phases to your goal`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setRoadmap(createRoadmapForProfile(profile))}>Generate Roadmap</Button>
            <Button onClick={handleAddPhase}>+ Add Phase</Button>
          </div>
        }
      />
      <div className="space-y-4">
        {[...roadmap].sort((a, b) => a.id - b.id).map(phase => (
          <Card key={phase.id} glow={phase.status === "active"}>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: phase.color + "22", border: `1px solid ${phase.color}44` }}>
                {phase.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      Phase {phase.id}: {phase.name}
                    </h3>
                    <p className="text-xs subtle">{phase.duration}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge color={phase.color}>{phase.status}</Badge>
                    <button onClick={() => handleEditPhase(phase)} className="text-[#94A3B8] hover:text-white text-sm">Edit</button>
                    <button onClick={() => handleDeletePhase(phase.id)} className="text-[#F87171] hover:text-white text-sm">Delete</button>
                  </div>
                </div>
                <p className="subtle text-sm mb-3">{phase.why}</p>
                {phase.topics.length > 0 && (
                  <div className="mb-3">
                    <p className="form-label mb-2 uppercase tracking-widest">Topics</p>
                    <div className="flex flex-wrap gap-2">
                      {phase.topics.map((t, i) => (
                        <span key={i} className="text-xs px-2 py-1 rounded-full bg-[#1E1E2E] text-[#94A3B8]">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
                {phase.tasks.length > 0 && (
                  <div className="mb-3">
                    <p className="form-label mb-2 uppercase tracking-widest">Tasks</p>
                    <ul className="list-disc list-inside text-sm text-[#D1D5DB] space-y-1">
                      {phase.tasks.map((task, i) => (
                        <li key={i}>{task}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {phase.resources.length > 0 && (
                  <div>
                    <p className="form-label mb-2 uppercase tracking-widest">Resources</p>
                    <div className="space-y-1">
                      {phase.resources.map((r, i) => (
                        <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-[#7C6AF7] hover:text-[#9A88FF] flex items-center gap-2">
                          <Badge color={phase.color}>{r.type}</Badge>
                          {r.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPhase ? "Edit Phase" : "Add Phase"}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label mb-1 block">Phase Name</label>
              <Input value={formData.name} onChange={v => setFormData({ ...formData, name: v })} placeholder="e.g., C Programming" />
            </div>
            <div>
              <label className="form-label mb-1 block">Icon</label>
              <Input value={formData.icon} onChange={v => setFormData({ ...formData, icon: v })} placeholder="e.g., ⭐" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label mb-1 block">Duration</label>
              <Input value={formData.duration} onChange={v => setFormData({ ...formData, duration: v })} placeholder="e.g., 4 weeks" />
            </div>
            <div>
              <label className="form-label mb-1 block">Color</label>
              <Input type="color" value={formData.color} onChange={v => setFormData({ ...formData, color: v })} />
            </div>
          </div>
          <div>
            <label className="form-label mb-1 block">Status</label>
            <select 
              value={formData.status} 
              onChange={e => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full fancy-input focus:border-transparent focus:ring-2 focus:ring-[rgba(124,106,247,0.18)]"
            >
              <option value="locked">Locked</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="form-label mb-1 block">Description</label>
            <textarea
              value={formData.why}
              onChange={e => setFormData({ ...formData, why: e.target.value })}
              placeholder="Why this phase is important"
              rows={3}
              className="w-full fancy-input resize-none focus:border-transparent focus:ring-2 focus:ring-[rgba(124,106,247,0.18)]"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label mb-1 block">Career Impact (%)</label>
              <Input type="number" value={String(formData.careerImpact)} onChange={v => setFormData({ ...formData, careerImpact: Number(v) })} />
            </div>
            <div>
              <label className="form-label mb-1 block">Research Impact (%)</label>
              <Input type="number" value={String(formData.researchImpact)} onChange={v => setFormData({ ...formData, researchImpact: Number(v) })} />
            </div>
          </div>
          <div>
            <label className="form-label mb-1 block">Topics (comma-separated)</label>
            <Input value={formData.topics} onChange={v => setFormData({ ...formData, topics: v })} placeholder="Topic 1, Topic 2" />
          </div>
          <div>
            <label className="form-label mb-1 block">Tasks (one per line)</label>
            <textarea
              value={formData.tasks}
              onChange={e => setFormData({ ...formData, tasks: e.target.value })}
              placeholder="e.g., Build a landing page"
              rows={3}
              className="w-full fancy-input resize-none focus:border-transparent focus:ring-2 focus:ring-[rgba(124,106,247,0.18)]"
            />
          </div>
          <div>
            <label className="form-label mb-1 block">Resources (one per line: Title|URL|Type)</label>
            <textarea
              value={formData.resources}
              onChange={e => setFormData({ ...formData, resources: e.target.value })}
              placeholder="Example Course|https://example.com|Course"
              rows={3}
              className="w-full fancy-input resize-none focus:border-transparent focus:ring-2 focus:ring-[rgba(124,106,247,0.18)]"
            />
          </div>
          <Button onClick={handleSavePhase} className="w-full">Save Phase</Button>
        </div>
      </Modal>
    </div>
  );
}

function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto modal-shell rounded-[28px] p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl section-title text-white">{title}</h3>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white text-2xl">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Academic
function Academic({ subjects, setSubjects, onScheduleReminder }: { subjects: Subject[]; setSubjects: (v: Subject[]) => void; onScheduleReminder: (label: string) => void }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({ name: "", code: "", credit: 3 });

  const handleAddSubject = () => {
    setEditingSubject(null);
    setFormData({ name: "", code: "", credit: 3 });
    setIsModalOpen(true);
  };

  const handleEditSubject = (subject: Subject) => {
    setEditingSubject(subject);
    setFormData(subject);
    setIsModalOpen(true);
  };

  const handleSaveSubject = () => {
    if (editingSubject) {
      setSubjects(subjects.map(s => s.code === editingSubject.code ? formData : s));
    } else {
      setSubjects([...subjects, formData]);
    }
    onScheduleReminder(formData.name);
    setIsModalOpen(false);
  };

  const handleDeleteSubject = (code: string) => {
    if (confirm("Delete this subject?")) {
      setSubjects(subjects.filter(s => s.code !== code));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <SectionHeader 
        title="Academic Tracker" 
        sub="Manage your courses"
        action={<Button onClick={handleAddSubject}>+ Add Subject</Button>}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {subjects.map((sub, i) => (
          <Card key={i}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs subtle">{sub.code}</p>
                <h3 className="text-lg font-bold text-white mt-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{sub.name}</h3>
                <p className="subtle text-xs mt-1">{sub.credit} credits</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEditSubject(sub)} className="text-[#94A3B8] hover:text-white text-sm">Edit</button>
                <button onClick={() => handleDeleteSubject(sub.code)} className="text-[#F87171] hover:text-white text-sm">Delete</button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingSubject ? "Edit Subject" : "Add Subject"}>
        <div className="space-y-4">
          <div>
            <label className="form-label mb-1 block">Subject Name</label>
            <Input value={formData.name} onChange={v => setFormData({ ...formData, name: v })} placeholder="e.g., Mathematics" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label mb-1 block">Course Code</label>
              <Input value={formData.code} onChange={v => setFormData({ ...formData, code: v })} placeholder="e.g., MATH 101" />
            </div>
            <div>
              <label className="form-label mb-1 block">Credits</label>
              <Input type="number" value={String(formData.credit)} onChange={v => setFormData({ ...formData, credit: Number(v) })} />
            </div>
          </div>
          <Button onClick={handleSaveSubject} className="w-full">Save Subject</Button>
        </div>
      </Modal>
    </div>
  );
}

// StudyJebu
function StudyJebu({ checklist, setChecklist }: { checklist: ChecklistItem[]; setChecklist: (v: ChecklistItem[]) => void; }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newItemLabel, setNewItemLabel] = useState("");

  const handleAddItem = () => {
    if (newItemLabel.trim()) {
      setChecklist([...checklist, { id: Date.now().toString(), label: newItemLabel.trim(), done: false }]);
      setNewItemLabel("");
      setIsModalOpen(false);
    }
  };

  const toggleItem = (id: string) => {
    setChecklist(checklist.map(item => item.id === id ? { ...item, done: !item.done } : item));
  };

  const deleteItem = (id: string) => {
    setChecklist(checklist.filter(item => item.id !== id));
  };

  return (
    <div className="p-6 space-y-6">
      <SectionHeader 
        title="StudyJebu" 
        sub="Your startup checklist"
        action={<Button onClick={() => setIsModalOpen(true)}>+ Add Item</Button>}
      />

      <div className="grid grid-cols-1 gap-4">
        <Card>
          <div className="space-y-3">
            {checklist.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl glass hover:shadow-[0_8px_32px_rgba(124,106,247,0.08)]">
                <div className="flex items-center gap-3 flex-1">
                  <button
                    onClick={() => toggleItem(item.id)}
                    className={`w-6 h-6 rounded border flex items-center justify-center ${item.done ? "bg-[#34D399] border-[#34D399]" : "border-[#475569] hover:border-[#7C6AF7]"}`}
                  >
                    {item.done && <span className="text-white text-xs">✓</span>}
                  </button>
                  <span className={item.done ? "subtle line-through" : "text-white"}>{item.label}</span>
                </div>
                <button onClick={() => deleteItem(item.id)} className="text-[#F87171] hover:text-white text-sm">Delete</button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Checklist Item">
        <div className="space-y-4">
          <div>
            <label className="form-label mb-1 block">Item</label>
            <Input value={newItemLabel} onChange={setNewItemLabel} placeholder="e.g., Launch website" />
          </div>
          <Button onClick={handleAddItem} className="w-full">Add Item</Button>
        </div>
      </Modal>
    </div>
  );
}

// Reminders segment
function RemindersSegment({ reminders, setReminders, alarmSettings }: { reminders: ReminderItem[]; setReminders: (items: ReminderItem[]) => void; alarmSettings: AlarmSettings }) {
  const [newReminderLabel, setNewReminderLabel] = useState("");
  const [newReminderMinutes, setNewReminderMinutes] = useState(10);
  const [dueReminder, setDueReminder] = useState<ReminderItem | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const nextDue = reminders.find(reminder => !reminder.triggered && reminder.dueAt <= now);
      if (nextDue) {
        setReminders(reminders.map(reminder => reminder.id === nextDue.id ? { ...reminder, triggered: true } : reminder));
        setDueReminder(nextDue);
        // Play alarm and show notification/vibrate
        try { playAlarm(alarmSettings, "Reminder", nextDue.label); } catch (e) {}
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [reminders, alarmSettings, setReminders]);

  const addReminder = () => {
    if (!newReminderLabel.trim() || newReminderMinutes <= 0) return;
    const dueAt = Date.now() + newReminderMinutes * 60 * 1000;
    setReminders([
      ...reminders,
      { id: Date.now().toString(), label: newReminderLabel.trim(), dueAt, triggered: false }
    ]);
    setNewReminderLabel("");
    setNewReminderMinutes(10);
  };

  const deleteReminder = (id: string) => {
    setReminders(reminders.filter(reminder => reminder.id !== id));
  };

  const dismissReminder = () => {
    setDueReminder(null);
  };

  const remainingSeconds = (dueAt: number) => {
    const seconds = Math.max(0, Math.ceil((dueAt - Date.now()) / 1000));
    return formatTime(seconds);
  };

  return (
    <div className="p-6 space-y-6">
      <SectionHeader title="Reminders" sub="Create a quick alert" />
      {dueReminder && (
        <div className="mb-4 rounded-xl border border-[#7C6AF7] bg-[#1D1734] p-4 text-sm text-[#E9D5FF]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold">Reminder due</p>
              <p>{dueReminder.label}</p>
            </div>
            <button onClick={dismissReminder} className="text-[#7C6AF7] hover:text-white text-sm">Dismiss</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="form-label mb-1 block">Reminder</label>
          <Input value={newReminderLabel} onChange={setNewReminderLabel} placeholder="What should I remember?" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="form-label mb-1 block">In minutes</label>
            <Input
              type="number"
              min={1}
              value={String(newReminderMinutes)}
              onChange={v => setNewReminderMinutes(Number(v) || 1)}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={addReminder} className="w-full">Add Reminder</Button>
          </div>
        </div>
        <div className="space-y-2">
          {reminders.length === 0 ? (
            <p className="subtle text-sm">No reminders yet. Add one to stay on track.</p>
          ) : (
            reminders.map(reminder => (
              <div key={reminder.id} className="flex items-center justify-between gap-3 rounded-2xl glass p-3">
                <div>
                  <p className="text-sm text-white font-medium">{reminder.label}</p>
                  <p className="subtle text-xs">{reminder.triggered ? "Due now" : `In ${remainingSeconds(reminder.dueAt)}`}</p>
                </div>
                <button onClick={() => deleteReminder(reminder.id)} className="text-[#F87171] hover:text-[#FB7185] text-sm">Remove</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function TimerSegment({ alarmSettings }: { alarmSettings: AlarmSettings }) {
  const [focusDuration, setFocusDuration] = useState(25);
  const [focusRemaining, setFocusRemaining] = useState(25 * 60);
  const [focusRunning, setFocusRunning] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  useEffect(() => {
    if (!focusRunning) return;
    const interval = setInterval(() => {
      setFocusRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          try { playAlarm(alarmSettings, "Timer finished", "Your focus session is complete."); } catch (e) {}
          setFocusRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [focusRunning, alarmSettings]);

  const handleStartFocus = () => {
    if (focusRemaining === 0) {
      setFocusRemaining(focusDuration * 60);
    }
    setFocusRunning(true);
  };

  const handlePauseFocus = () => setFocusRunning(false);

  const handleResetFocus = () => {
    setFocusRunning(false);
    setFocusRemaining(focusDuration * 60);
  };

  return (
    <div className="p-6 space-y-6">
      <SectionHeader title="Timer" sub="Dedicated focus timer" />
      <Card>
        <div className="space-y-4">
          <div className="rounded-3xl glass p-6 text-center">
            <p className="text-sm text-[#94A3B8] mb-2">Timer</p>
            <p className="text-5xl font-bold text-white">{formatTime(focusRemaining)}</p>
            <p className="subtle text-xs mt-2">{focusRunning ? "Running" : focusRemaining === 0 ? "Ready" : "Paused"}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label mb-1 block">Duration (minutes)</label>
              <Input
                type="number"
                min={1}
                value={String(focusDuration)}
                onChange={v => {
                  const value = Number(v);
                  if (value > 0) {
                    setFocusDuration(value);
                    if (!focusRunning) {
                      setFocusRemaining(value * 60);
                    }
                  }
                }}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleStartFocus} className="w-full">{focusRunning ? "Restart" : "Start"}</Button>
              <Button variant="secondary" onClick={focusRunning ? handlePauseFocus : handleResetFocus} className="w-full">
                {focusRunning ? "Pause" : "Reset"}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Settings
function Settings({ 
  profile, setProfile, setRoadmap, state, setState, onSignOut 
}: { 
  profile: UserProfile; setProfile: (v: UserProfile) => void;
  setRoadmap: (roadmap: RoadmapPhase[]) => void;
  state: AppState; setState: (v: AppState) => void;
  onSignOut: () => void;
}) {
  const [formData, setFormData] = useState(profile);
  const [alarmForm, setAlarmForm] = useState<AlarmSettings>(state.alarmSettings);

  const [saveError, setSaveError] = useState("");

  const handleSave = () => {
    if (!formData.careerGoal.trim()) {
      setSaveError("Career Goal is required to generate a roadmap.");
      return;
    }

    setSaveError("");
    setProfile(formData);
    setRoadmap(createRoadmapForProfile(formData));
  };

  return (
    <div className="p-6 space-y-6">
      <SectionHeader title="Settings" sub="Manage your profile and app data" />
      <Card>
        <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Profile</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label mb-1 block">Name</label>
              <Input value={formData.name} onChange={v => setFormData({ ...formData, name: v })} />
            </div>
            <div>
              <label className="form-label mb-1 block">Initial</label>
              <Input value={formData.initial} onChange={v => setFormData({ ...formData, initial: v })} maxLength={1} />
            </div>
          </div>
          <div>
            <label className="form-label mb-1 block">University</label>
            <Input value={formData.university} onChange={v => setFormData({ ...formData, university: v })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label mb-1 block">Academic Stage</label>
              <select
                value={formData.academicStage}
                onChange={e => setFormData({ ...formData, academicStage: e.target.value as AcademicStage })}
                className="w-full fancy-input focus:border-transparent focus:ring-2 focus:ring-[rgba(124,106,247,0.18)]"
              >
                <option value="Class 11">Class 11</option>
                <option value="Class 12">Class 12</option>
                <option value="HSC Candidate">HSC Candidate</option>
                <option value="University Student">University Student</option>
              </select>
            </div>
            <div>
              <label className="form-label mb-1 block">Department</label>
              <Input value={formData.department} onChange={v => setFormData({ ...formData, department: v })} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label mb-1 block">Career Goal</label>
              <select
                value={formData.careerGoal}
                onChange={e => setFormData({ ...formData, careerGoal: e.target.value as CareerGoal })}
                className="w-full fancy-input focus:border-transparent focus:ring-2 focus:ring-[rgba(124,106,247,0.18)]"
              >
                <option value="Medical Admission">Medical Admission</option>
                <option value="Engineering Admission">Engineering Admission</option>
                <option value="Embedded Engineer">Embedded Engineer</option>
                <option value="AI Engineer">AI Engineer</option>
                <option value="Robotics Engineer">Robotics Engineer</option>
                <option value="VLSI Engineer">VLSI Engineer</option>
                <option value="Software Engineer">Software Engineer</option>
                <option value="Researcher">Researcher</option>
              </select>
            </div>
            <div>
              <label className="form-label mb-1 block">CGPA Goal</label>
              <Input type="number" step="0.01" value={String(formData.cgpaGoal)} onChange={v => setFormData({ ...formData, cgpaGoal: Number(v) })} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label mb-1 block">Current CGPA</label>
              <Input type="number" step="0.01" value={String(formData.cgpa)} onChange={v => setFormData({ ...formData, cgpa: Number(v) })} />
            </div>
            <div>
              <label className="form-label mb-1 block">CGPA Goal</label>
              <Input type="number" step="0.01" value={String(formData.cgpaGoal)} onChange={v => setFormData({ ...formData, cgpaGoal: Number(v) })} />
            </div>
          </div>
          <Button onClick={handleSave}>Save Profile</Button>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Alarm Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="form-label mb-1 block">Ringtone URL</label>
            <Input value={alarmForm.customUrl} onChange={v => setAlarmForm({ ...alarmForm, customUrl: v })} placeholder="/alarm.mp3 or https://example.com/tone.mp3" />
          </div>
          <div>
            <label className="form-label mb-1 block">Ringtone Name</label>
            <Input value={alarmForm.customName} onChange={v => setAlarmForm({ ...alarmForm, customName: v })} placeholder="My custom tone" />
          </div>
          <div>
            <label className="form-label mb-1 block">Alert Duration (seconds)</label>
            <Input type="number" min={1} value={String(alarmForm.durationMs / 1000)} onChange={v => setAlarmForm({ ...alarmForm, durationMs: Math.max(1000, Number(v) * 1000) })} />
          </div>
          <Button onClick={() => setState({ ...state, alarmSettings: alarmForm })} className="w-full">Save Alarm Settings</Button>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Stats</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label mb-1 block">Total XP</label>
              <Input type="number" value={String(state.xp)} onChange={v => setState({ ...state, xp: Number(v) })} />
            </div>
            <div>
              <label className="form-label mb-1 block">Streak Days</label>
              <Input type="number" value={String(state.streakDays)} onChange={v => setState({ ...state, streakDays: Number(v) })} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label mb-1 block">Weekly Hours</label>
              <Input type="number" value={String(state.weeklyHours)} onChange={v => setState({ ...state, weeklyHours: Number(v) })} />
            </div>
            <div>
              <label className="form-label mb-1 block">Completed Today</label>
              <Input type="number" value={String(state.completedToday)} onChange={v => setState({ ...state, completedToday: Number(v) })} />
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Account</h3>
        <Button variant="danger" onClick={onSignOut}>Sign Out</Button>
      </Card>
    </div>
  );
}




