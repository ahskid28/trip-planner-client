"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";

import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";

import { CSS } from "@dnd-kit/utilities";

type User = {
  id: string;
  name: string;
  email: string;
};

type Trip = {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  owner?: User;
};

type ItineraryDay = {
  id: string;
  dayNumber: number;
  date: string;
};

type ItineraryItem = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  location: string | null;
  cost: number | null;
  dayId: string;
};

type Collaborator = {
  id: string;
  role: string;
  user: User;
};

type BudgetBreakdown = {
  hotel: number;
  food: number;
  transport: number;
  activities: number;
  shopping: number;
};

type Expense = {
  id: string;
  title: string;
  category: string;
  amount: number;
  tripId: string;
};

function SortableItineraryItem({
  item,
  onDelete,
  toggleFavorite,
  favoriteItems = [],
  completedItems = [],
  toggleCompleted,
}: {
  item: ItineraryItem;
  onDelete: (id: string) => void;
  toggleFavorite: (id: string) => void;
  favoriteItems: string[];
  completedItems: string[];
  toggleCompleted: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
const isFavorite = favoriteItems.includes(item.id);
  
return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start justify-between rounded border bg-white/90 backdrop-blur-md p-4"
    >
      <div>
        <button
          {...attributes}
          {...listeners}
          className="mb-2 cursor-grab rounded bg-gray-200 px-2 py-1 text-xs"
        >
          Drag
        </button>

        <div className="flex items-center gap-3">
  <h4 className="text-lg font-bold text-slate-800">{item.title}</h4>

  <button
    onClick={() => toggleFavorite(item.id)}
    className="text-xl"
  >
    {favoriteItems.includes(item.id) ? "⭐" : "☆"}
  </button>

  <button
  onClick={() => toggleCompleted(item.id)}
  className="ml-2 rounded bg-green-600 px-2 py-1 text-xs text-white"
>
  {completedItems.includes(item.id)
    ? "Done ✅"
    : "Mark Done"}
</button>
</div>
        <p className="text-sm text-gray-600">Type: {item.type}</p>

        {item.location && (
          <div className="mt-1">
            <p className="text-sm text-gray-600">Location: {item.location}</p>

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                item.location
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block rounded bg-blue-600 px-3 py-1 text-xs text-white"
            >
              Open in Google Maps
            </a>
          </div>
        )}

     <button
          onClick={() => toggleFavorite(item.id)}
            className="mr-2 rounded bg-yellow-500 px-3 py-1 text-sm text-white"
>
          {isFavorite ? "⭐" : "☆"}
         </button>
        {item.cost !== null && (
          <p className="text-sm text-gray-600">Cost: ₹{item.cost}</p>
        )}
      </div>

      <button
        onClick={() => onDelete(item.id)}
        className="rounded bg-red-600 px-3 py-1 text-sm text-white"
      >
        Delete
      </button>
    </div>
  );
}

export default function TripDetailPage() {
  const router = useRouter();
  const params = useParams();
  const tripId = params.tripId as string;
  useEffect(() => {
  const token = localStorage.getItem("token");

  if (!token) {
    router.push("/login");
  }
}, [router]);
  const pdfRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(useSensor(PointerSensor));

  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [itemsByDay, setItemsByDay] = useState<Record<string, ItineraryItem[]>>(
    {}
  );
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [newDayNumber, setNewDayNumber] = useState("");
  const [newDayDate, setNewDayDate] = useState("");

  const [selectedDayId, setSelectedDayId] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("activity");
  const [location, setLocation] = useState("");
  const [cost, setCost] = useState("");

  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("editor");

  const [aiPreferences, setAiPreferences] = useState("");
  const [aiPlan, setAiPlan] = useState("");
  const [budgetBreakdown, setBudgetBreakdown] =
    useState<BudgetBreakdown | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingAiItems, setIsSavingAiItems] = useState(false);
  const [isGeneratingBudget, setIsGeneratingBudget] = useState(false);

  const [weather, setWeather] = useState<any>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);

  const [attractions, setAttractions] = useState<any[]>([]);
  const [isLoadingAttractions, setIsLoadingAttractions] = useState(false);

  const [hotels, setHotels] = useState<any[]>([]);
  const [isLoadingHotels, setIsLoadingHotels] = useState(false);

  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [isLoadingRestaurants, setIsLoadingRestaurants] = useState(false);

  const [chatMessage, setChatMessage] = useState("");
  const [chatReply, setChatReply] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("food");
  const [expenseAmount, setExpenseAmount] = useState("");

  const [itinerarySearch, setItinerarySearch] = useState("");
  const [itineraryTypeFilter, setItineraryTypeFilter] = useState("all");
  const [itinerarySort, setItinerarySort] = useState("default");
  const [favoriteItems, setFavoriteItems] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [completedItems, setCompletedItems] = useState<string[]>([]);
  const [progressRecommendations, setProgressRecommendations] = useState<any[]>([]);
const [isLoadingProgressRecommendations, setIsLoadingProgressRecommendations] = useState(false);
const [tripNotes, setTripNotes] = useState("");
const [milestones, setMilestones] = useState<string[]>([]);
const [newMilestone, setNewMilestone] = useState("");

const [bookings, setBookings] = useState<any[]>([]);
const [bookingTitle, setBookingTitle] = useState("");
const [bookingType, setBookingType] = useState("hotel");
const [bookingDate, setBookingDate] = useState("");
const [bookingStatus, setBookingStatus] = useState("pending");
const [bookingReference, setBookingReference] = useState("");
const [packingItems, setPackingItems] = useState<
  {
    text: string;
    packed: boolean;
  }[]
>([]);
const [newPackingItem, setNewPackingItem] = useState("");
const [isDarkMode, setIsDarkMode] = useState(false);

  const createdById = "e56f6d00-4994-4940-88d7-806835aff75f";

  const fetchTrip = async () => {
    const res = await fetch(`http://localhost:5000/trips/${tripId}`);
    const data = await res.json();
    setTrip(data);
  };

  const fetchUsers = async () => {
    const res = await fetch("http://localhost:5000/users");
    const data = await res.json();
    setUsers(data);
  };

  const fetchCollaborators = async () => {
    const res = await fetch(
      `http://localhost:5000/trips/${tripId}/collaborators`
    );
    const data = await res.json();
    setCollaborators(data);
  };

  const fetchDays = async () => {
    const res = await fetch(`http://localhost:5000/trips/${tripId}/days`);
    const data = await res.json();

    setDays(data);

    if (data.length > 0 && !selectedDayId) {
      setSelectedDayId(data[0].id);
    }

    const groupedItems: Record<string, ItineraryItem[]> = {};

    for (const day of data) {
      const itemRes = await fetch(`http://localhost:5000/days/${day.id}/items`);
      const itemData = await itemRes.json();
      groupedItems[day.id] = itemData;
    }

    setItemsByDay(groupedItems);
  };

  const fetchExpenses = async () => {
    const res = await fetch(`http://localhost:5000/trips/${tripId}/expenses`);
    const data = await res.json();
    setExpenses(data);
  };

  useEffect(() => {
    fetchTrip();
    fetchUsers();
    fetchDays();
    fetchCollaborators();
    fetchExpenses();
  }, [tripId]);

  useEffect(() => {
  const savedFavorites = localStorage.getItem(`favorites-${tripId}`);

  if (savedFavorites) {
    setFavoriteItems(JSON.parse(savedFavorites));
  }
}, [tripId]);

useEffect(() => {
  localStorage.setItem(
    `favorites-${tripId}`,
    JSON.stringify(favoriteItems)
  );
}, [favoriteItems, tripId]);

useEffect(() => {
  const savedCompleted = localStorage.getItem(`completed-${tripId}`);

  if (savedCompleted) {
    setCompletedItems(JSON.parse(savedCompleted));
  }
}, [tripId]);

useEffect(() => {
  localStorage.setItem(
    `completed-${tripId}`,
    JSON.stringify(completedItems)
  );
}, [completedItems, tripId]);

useEffect(() => {
  const savedNotes = localStorage.getItem(`notes-${tripId}`);

  if (savedNotes) {
    setTripNotes(savedNotes);
  }
}, [tripId]);

useEffect(() => {
  localStorage.setItem(`notes-${tripId}`, tripNotes);
}, [tripNotes, tripId]);

useEffect(() => {
  const savedMilestones = localStorage.getItem(
    `milestones-${tripId}`
  );

  if (savedMilestones) {
    setMilestones(JSON.parse(savedMilestones));
  }
}, [tripId]);

useEffect(() => {
  localStorage.setItem(
    `milestones-${tripId}`,
    JSON.stringify(milestones)
  );
}, [milestones, tripId]);

useEffect(() => {
  const savedPackingItems = localStorage.getItem(
    `packing-${tripId}`
  );

  if (savedPackingItems) {
    setPackingItems(JSON.parse(savedPackingItems));
  }
}, [tripId]);

useEffect(() => {
  localStorage.setItem(
    `packing-${tripId}`,
    JSON.stringify(packingItems)
  );
}, [packingItems, tripId]);

const addBooking = () => {
  if (!bookingTitle.trim()) return;

  const newBooking = {
    id: Date.now().toString(),
    title: bookingTitle,
    type: bookingType,
    date: bookingDate,
    status: bookingStatus,
    reference: bookingReference,
  };

  setBookings((prev) => [...prev, newBooking]);

  setBookingTitle("");
  setBookingType("hotel");
  setBookingDate("");
  setBookingStatus("pending");
  setBookingReference("");
};

const deleteBooking = (bookingId: string) => {
  setBookings((prev) =>
    prev.filter((booking) => booking.id !== bookingId)
  );
};

  const handleDragEnd = async (dayId: string, event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const currentItems = itemsByDay[dayId] || [];

    const oldIndex = currentItems.findIndex((item) => item.id === active.id);
    const newIndex = currentItems.findIndex((item) => item.id === over.id);

    const reorderedItems = arrayMove(currentItems, oldIndex, newIndex);

    setItemsByDay({
      ...itemsByDay,
      [dayId]: reorderedItems,
    });

    await fetch(`http://localhost:5000/days/${dayId}/items/reorder`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        itemIds: reorderedItems.map((item) => item.id),
      }),
    });
  };

  const createDay = async () => {
    if (!newDayNumber || !newDayDate) {
      alert("Please enter day number and date");
      return;
    }

    await fetch("http://localhost:5000/days", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tripId,
        dayNumber: Number(newDayNumber),
        date: newDayDate,
      }),
    });

    setNewDayNumber("");
    setNewDayDate("");
    fetchDays();
  };

  const createItem = async () => {
    if (!title || !type || !selectedDayId) {
      alert("Please fill title, type, and select a day");
      return;
    }

    await fetch("http://localhost:5000/items", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        description: "",
        type,
        location,
        cost: cost ? Number(cost) : null,
        dayId: selectedDayId,
        createdById,
      }),
    });

    setTitle("");
    setType("activity");
    setLocation("");
    setCost("");
    fetchDays();
  };

  const deleteItem = async (itemId: string) => {
    await fetch(`http://localhost:5000/items/${itemId}`, {
      method: "DELETE",
    });

    fetchDays();
  };

  const toggleFavorite = (itemId: string) => {
  setFavoriteItems((prev) =>
    prev.includes(itemId)
      ? prev.filter((id) => id !== itemId)
      : [...prev, itemId]
  );
};

const addMilestone = () => {
  if (!newMilestone.trim()) return;

  setMilestones((prev) => [...prev, newMilestone]);
  setNewMilestone("");
};





const toggleCompleted = (itemId: string) => {
  setCompletedItems((prev) =>
    prev.includes(itemId)
      ? prev.filter((id) => id !== itemId)
      : [...prev, itemId]
  );
};
  
const inviteCollaborator = async () => {
    if (!selectedUserId) {
      alert("Please select a user");
      return;
    }

    await fetch(`http://localhost:5000/trips/${tripId}/collaborators`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: selectedUserId,
        role: selectedRole,
      }),
    });

    setSelectedUserId("");
    setSelectedRole("editor");
    fetchCollaborators();
  };

  const removeCollaborator = async (collaboratorId: string) => {
    await fetch(`http://localhost:5000/collaborators/${collaboratorId}`, {
      method: "DELETE",
    });

    fetchCollaborators();
  };

  const updateCollaboratorRole = async (
    collaboratorId: string,
    newRole: string
  ) => {
    await fetch(`http://localhost:5000/collaborators/${collaboratorId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: newRole,
      }),
    });

    fetchCollaborators();
  };

  const generateAiPlan = async () => {
    if (!trip) return;

    setIsGenerating(true);
    setAiPlan("");

    try {
      const totalDays = Math.max(days.length, 1);

      const res = await fetch("http://localhost:5000/ai/generate-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destination: trip.destination,
          days: totalDays,
          budget: trip.budget,
          preferences: aiPreferences || "budget friendly sightseeing and food",
        }),
      });

      const data = await res.json();
      setAiPlan(data.plan || "AI could not generate a plan. Please try again.");
    } catch {
      setAiPlan("Failed to connect to AI backend.");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAndSaveAiItems = async () => {
    if (!trip) return;

    if (days.length === 0) {
      alert("Please create at least one itinerary day first.");
      return;
    }

    setIsSavingAiItems(true);

    try {
      const res = await fetch("http://localhost:5000/ai/generate-items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tripId,
          preferences: aiPreferences || "budget friendly sightseeing and food",
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert(`AI created ${data.itemsCreated} itinerary items.`);
        fetchDays();
      } else {
        alert(data.error || "AI could not create itinerary items.");
      }
    } catch {
      alert("Failed to connect to AI backend.");
    } finally {
      setIsSavingAiItems(false);
    }
  };

  const generateBudgetBreakdown = async () => {
    if (!trip) return;

    setIsGeneratingBudget(true);
    setBudgetBreakdown(null);

    try {
      const res = await fetch("http://localhost:5000/ai/budget-breakdown", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destination: trip.destination,
          days: Math.max(days.length, 1),
          budget: trip.budget,
        }),
      });

      const data = await res.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      setBudgetBreakdown(data);
    } catch {
      alert("Failed to connect to AI budget backend.");
    } finally {
      setIsGeneratingBudget(false);
    }
  };

  const fetchWeather = async () => {
    if (!trip) return;

    setIsLoadingWeather(true);

    try {
      const res = await fetch("http://localhost:5000/weather", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destination: trip.destination,
        }),
      });

      const data = await res.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      setWeather(data);
    } catch {
      alert("Failed to fetch weather");
    } finally {
      setIsLoadingWeather(false);
    }
  };

  const fetchNearbyAttractions = async () => {
    if (!trip) return;

    setIsLoadingAttractions(true);

    try {
      const res = await fetch("http://localhost:5000/ai/nearby-attractions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destination: trip.destination,
          preferences: aiPreferences || "popular tourist attractions",
        }),
      });

      const data = await res.json();

      if (data.success) {
        setAttractions(data.attractions);
      } else {
        alert(data.error || "Failed to load attractions");
      }
    } catch {
      alert("Failed to connect to attractions backend");
    } finally {
      setIsLoadingAttractions(false);
    }
  };

  const fetchHotels = async () => {
    if (!trip) return;

    setIsLoadingHotels(true);

    try {
      const res = await fetch("http://localhost:5000/ai/hotels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destination: trip.destination,
          budget: trip.budget,
          preferences: aiPreferences || "safe budget-friendly stay",
        }),
      });

      const data = await res.json();

      if (data.success) {
        setHotels(data.hotels);
      } else {
        alert(data.error || "Failed to load hotels");
      }
    } catch {
      alert("Failed to connect to hotel backend");
    } finally {
      setIsLoadingHotels(false);
    }
  };

  const fetchRestaurants = async () => {
    if (!trip) return;

    setIsLoadingRestaurants(true);

    try {
      const res = await fetch("http://localhost:5000/ai/restaurants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destination: trip.destination,
          preferences: aiPreferences || "popular budget-friendly local food",
        }),
      });

      const data = await res.json();

      if (data.success) {
        setRestaurants(data.restaurants);
      } else {
        alert(data.error || "Failed to load restaurants");
      }
    } catch {
      alert("Failed to connect to restaurant backend");
    } finally {
      setIsLoadingRestaurants(false);
    }
  };

  const askTravelChatbot = async () => {
    if (!trip || !chatMessage.trim()) return;

    setIsChatLoading(true);
    setChatReply("");

    try {
      const res = await fetch("http://localhost:5000/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tripId,
          message: chatMessage,
        }),
      });

      const data = await res.json();

      if (data.reply) {
        setChatReply(data.reply);
      } else {
        alert(data.error || "AI chatbot failed");
      }
    } catch {
      alert("Failed to connect to AI chatbot backend");
    } finally {
      setIsChatLoading(false);
    }
  };

  const createExpense = async () => {
    if (!expenseTitle || !expenseCategory || !expenseAmount) {
      alert("Please fill expense title, category, and amount");
      return;
    }

    await fetch("http://localhost:5000/expenses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: expenseTitle,
        category: expenseCategory,
        amount: Number(expenseAmount),
        tripId,
      }),
    });

    setExpenseTitle("");
    setExpenseCategory("food");
    setExpenseAmount("");
    fetchExpenses();
  };

  const deleteExpense = async (expenseId: string) => {
    await fetch(`http://localhost:5000/expenses/${expenseId}`, {
      method: "DELETE",
    });

    fetchExpenses();
  };

  const exportPdf = async () => {
  if (!pdfRef.current) return;

  const originalBackground = document.body.style.background;
  document.body.style.background = "#ffffff";

  try {
    const canvas = await html2canvas(pdfRef.current, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    pdf.text("Trip Notes", 10, 120);
pdf.text(tripNotes || "No notes added", 10, 130);

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${trip?.title || "trip"}-itinerary.pdf`);
  } finally {
    document.body.style.background = originalBackground;
  }
};
const fetchProgressRecommendations = async () => {
  if (!trip) return;

  setIsLoadingProgressRecommendations(true);

  try {
    const res = await fetch("http://localhost:5000/ai/progress-recommendations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        destination: trip.destination,
        remainingBudget,
        completedCount,
        totalItems,
        favorites: favoriteItems,
      }),
    });

    const data = await res.json();

    if (data.success) {
      setProgressRecommendations(data.recommendations);
    } else {
      alert(data.error || "Failed to load recommendations");
    }
  } catch {
    alert("Failed to connect to progress recommendations backend");
  } finally {
    setIsLoadingProgressRecommendations(false);
  }
};



 if (!trip) {
  return <div className="p-8">Loading trip...</div>;
}

const totalSpent = expenses.reduce(
  (sum, expense) => sum + Number(expense.amount),
  0
);

const totalItems = Object.values(itemsByDay).reduce(
  (sum, items) => sum + items.length,
  0
);
const completedCount = completedItems.length;
const completionPercent =
  totalItems > 0
    ? Math.round((completedCount / totalItems) * 100)
    : 0;

    

const remainingBudget = trip.budget - totalSpent;




const budgetUsedPercent =
  trip.budget > 0
    ? Math.round((totalSpent / trip.budget) * 100)
    : 0;

    const smartSummary = `
This trip has ${days.length} day(s), ${totalItems} itinerary item(s),
${completedCount} completed item(s), and ${favoriteItems.length} favorite item(s).

You have spent ₹${totalSpent} out of ₹${trip.budget},
with ₹${remainingBudget} remaining.

Budget used: ${budgetUsedPercent}%.
Trip completion: ${completionPercent}%.
`;

const budgetChartData = [
  {
    name: "Spent",
    value: totalSpent,
  },
  {
    name: "Remaining",
    value: Math.max(remainingBudget, 0),
  },
];

const budgetChartColors = [
  "#ef4444",
  "#22c55e",
];

const expenseByCategory = expenses.reduce<Record<string, number>>(
  (acc, expense) => {
    acc[expense.category] =
      (acc[expense.category] || 0) + Number(expense.amount);

    return acc;
  },
  {}
);

const isNearBudget =
  budgetUsedPercent >= 80 &&
  budgetUsedPercent < 100;

const isOverBudget =
  budgetUsedPercent >= 100;

 const dayActivityStats = days.map((day) => ({
  day: `Day ${day.dayNumber}`,
  count: (itemsByDay[day.id] || []).length,
}));

const tripHealthScore =
  Math.round(
    (completionPercent * 0.6) +
    ((100 - Math.min(budgetUsedPercent, 100)) * 0.4)
  );

  const confirmedBookings = bookings.filter(
  (booking) => booking.status === "confirmed"
).length;

const pendingBookings = bookings.filter(
  (booking) => booking.status === "pending"
).length;

const cancelledBookings = bookings.filter(
  (booking) => booking.status === "cancelled"
).length;
  
  const tripHealthMessage =
  tripHealthScore >= 80
    ? "Excellent trip planning progress."
    : tripHealthScore >= 50
    ? "Good progress, but keep an eye on budget and pending items."
    : "Needs attention. Complete more items and control spending.";

    const addPackingItem = () => {
  if (!newPackingItem.trim()) return;

  setPackingItems((prev) => [
  ...prev,
  {
    text: newPackingItem,
    packed: false,
  },
]);
  setNewPackingItem("");
};

const deletePackingItem = (itemIndex: number) => {
  setPackingItems((prev) =>
    prev.filter((_, index) => index !== itemIndex)
  );
};
const togglePacked = (index: number) => {
  setPackingItems((prev) =>
    prev.map((item, i) =>
      i === index
        ? {
            ...item,
            packed: !item.packed,
          }
        : item
    )
  );
};

const packedCount = packingItems.filter(
  (item) => item.packed
).length;

const packingPercent =
  packingItems.length > 0
    ? Math.round(
        (packedCount / packingItems.length) * 100
      )
    : 0;

    

  return (
    <main
  className={`min-h-screen p-8 transition ${
    isDarkMode
      ? "bg-slate-950 text-white"
      : "bg-linear-to-br from-slate-100 via-blue-50 to-purple-100 text-slate-900"
  }`}
>
      <div ref={pdfRef} className="mx-auto max-w-6xl space-y-8">
        <div className="mb-8 overflow-hidden rounded-3xl bg-linear-to-r from-blue-600 via-purple-600 to-pink-600 p-8 text-white shadow-2xl">
  <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
    <div>
      <p className="mb-2 text-sm font-medium uppercase tracking-widest text-blue-100">
        Your Travel Plan
      </p>

      <h1 className="text-4xl font-extrabold md:text-5xl">
        {trip.title}
      </h1>

      <p className="mt-3 text-lg text-blue-100">
        📍 {trip.destination}
      </p>
    </div>

    <div className="flex flex-wrap gap-3">
  <button
    onClick={exportPdf}
    className="rounded-full bg-white/90 backdrop-blur-md px-6 py-3 font-semibold text-purple-700 shadow-lg transition hover:scale-105 hover:bg-gray-100"
  >
    Export PDF
  </button>

  <button
    onClick={() => setIsDarkMode(!isDarkMode)}
    className="rounded-full bg-white/90 backdrop-blur-md/20 px-5 py-3 font-semibold text-white shadow-lg transition hover:scale-105 hover:bg-white/30"
  >
    {isDarkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
  </button>
</div>
</div>

  <div className="mt-8 grid gap-4 md:grid-cols-3">
    <div className="rounded-2xl bg-white/90 backdrop-blur-md/20 p-4 backdrop-blur">
      <p className="text-sm text-blue-100">Start Date</p>
      <p className="text-xl font-bold">
        {new Date(trip.startDate).toLocaleDateString()}
      </p>
    </div>

    <div className="rounded-2xl bg-white/90 backdrop-blur-md/20 p-4 backdrop-blur">
      <p className="text-sm text-blue-100">End Date</p>
      <p className="text-xl font-bold">
        {new Date(trip.endDate).toLocaleDateString()}
      </p>
    </div>

    <div className="rounded-2xl bg-white/90 backdrop-blur-md/20 p-4 backdrop-blur">
      <p className="text-sm text-blue-100">Budget</p>
      <p className="text-xl font-bold">₹{trip.budget}</p>
    </div>
  </div>
</div>
        <div className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-xl backdrop-blur">
  <div className="mb-6 flex items-center justify-between">
  <div>
    <p className="text-sm font-medium uppercase tracking-widest text-blue-500">
      Dashboard
    </p>
    <h2 className="text-3xl font-extrabold text-slate-800">
      Trip Analytics
    </h2>
  </div>
</div>

  {isNearBudget && (
  <div className="mb-4 rounded border border-yellow-300 bg-yellow-50 p-4 text-yellow-800">
    ⚠️ You have used {budgetUsedPercent}% of your budget.
    Be careful with future expenses.
  </div>
)}

{isOverBudget && (
  <div className="mb-4 rounded border border-red-300 bg-red-50 p-4 text-red-800">
    🚨 You are over budget by ₹{totalSpent - trip.budget}.
  </div>
)}

<div className="mb-6">
  <div className="mb-2 flex justify-between text-sm text-gray-600">
    <span>Budget Usage</span>
    <span>{budgetUsedPercent}%</span>
  </div>

  <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200">
    <div
      className={`h-3 rounded-full ${
        isOverBudget
          ? "bg-red-600"
          : isNearBudget
          ? "bg-yellow-500"
          : "bg-green-600"
      }`}
      style={{
        width: `${Math.min(budgetUsedPercent, 100)}%`,
      }}
    />
  </div>
</div>
<div className="mb-6 rounded border bg-gray-50 p-4">
  <h3 className="mb-2 font-semibold">
    Smart Trip Summary
  </h3>

  <p className="text-sm leading-6 text-gray-700">
    {smartSummary}
  </p>
</div>

<div className="mb-6 rounded border bg-white/90 backdrop-blur-md p-4">
  <h3 className="mb-4 font-semibold">
    Budget Breakdown
  </h3>

  <div className="h-72">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={budgetChartData}
          dataKey="value"
          nameKey="name"
          outerRadius={100}
          label
        >
          {budgetChartData.map((entry, index) => (
            <Cell
              key={index}
              fill={budgetChartColors[index]}
            />
          ))}
        </Pie>

        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  </div>
</div>

<div className="mb-6 rounded border bg-white/90 backdrop-blur-md p-4">
  <h3 className="mb-4 font-semibold">
    Daily Activity Chart
  </h3>

  <div className="h-72">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={dayActivityStats}>
        <XAxis dataKey="day" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="count" fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  </div>
</div>

<div className="mb-6 rounded border bg-yellow-50 p-4">
  <h3 className="mb-2 font-semibold">Trip Notes</h3>

  <textarea
    className="w-full rounded border p-3"
    rows={4}
    placeholder="Write notes, reminders, packing list, bookings, etc..."
    value={tripNotes}
    onChange={(e) => setTripNotes(e.target.value)}
  />

  <p className="mt-1 text-xs text-gray-500">
  {tripNotes.length} characters
</p>

<p className="mt-2 text-xs text-green-600">
  Notes are saved automatically.
</p>
  
  <button
  onClick={() => setTripNotes("")}
  className="mt-3 rounded bg-yellow-600 px-4 py-2 text-white"
>
  Clear Notes
</button>
</div>

<div className="mb-6 rounded border bg-blue-50 p-4">
  <h3 className="mb-3 font-semibold">
    Trip Milestones
  </h3>

  <div className="flex gap-2">
    <input
      className="flex-1 rounded border p-2"
      placeholder="Add milestone..."
      value={newMilestone}
      onChange={(e) => setNewMilestone(e.target.value)}
    />

    <button
      onClick={addMilestone}
      className="rounded-full bg-blue-600 px-5 py-2 font-semibold text-white shadow-md transition hover:scale-105 hover:bg-blue-700"
    >
      Add
    </button>
  </div>

  <div className="mt-4 space-y-2">
    {milestones.map((milestone, index) => (
      <div
        key={index}
        className="rounded border bg-white/90 backdrop-blur-md p-2"
      >
        🎯 {milestone}
      </div>
    ))}
  </div>
</div>

<div className="mb-6 rounded-xl border bg-white/90 backdrop-blur-md p-6 shadow">
 <div className="mb-6 flex items-center justify-between">
  <div>
    <p className="text-sm font-medium uppercase tracking-widest text-blue-500">
      Dashboard
    </p>
    <h2 className="text-3xl font-extrabold text-slate-800">
      Booking Manager
    </h2>
  </div>
</div>

  <div className="mb-4 grid gap-3 md:grid-cols-4">
    <input
      type="text"
      placeholder="Booking title"
      value={bookingTitle}
      onChange={(e) => setBookingTitle(e.target.value)}
      className="w-full rounded-2xl border border-gray-200 bg-white/90 px-5 py-3 shadow-md backdrop-blur focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
    />

    <input
      type="date"
      value={bookingDate}
      onChange={(e) => setBookingDate(e.target.value)}
      className="w-full rounded-2xl border border-gray-200 bg-white/90 px-5 py-3 shadow-md backdrop-blur-md focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
    />

    <select
      value={bookingType}
      onChange={(e) => setBookingType(e.target.value)}
      className="w-full rounded-2xl border border-gray-200 bg-white/90 px-5 py-3 shadow-md backdrop-blur-md focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
    >
      <option value="flight">Flight</option>
      <option value="hotel">Hotel</option>
      <option value="train">Train</option>
      <option value="activity">Activity</option>
    </select>

    <button
      onClick={addBooking}
      className="rounded-full bg-blue-600 px-5 py-2 font-semibold text-white shadow-md transition hover:scale-105 hover:bg-blue-700"
    >
      Add Booking
    </button>
  </div>

  <div className="space-y-2">
    {bookings.map((booking) => (
      <div
        key={booking.id}
        className="flex items-center justify-between rounded border p-3"
      >
        <div>
          <p className="font-semibold">{booking.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">
            {booking.type} • {booking.date}
          </p>
        </div>
      </div>
    ))}
  </div>
</div>

<div className="mb-6 rounded-xl border bg-white/90 backdrop-blur-md p-6 shadow">
 <div className="mb-6 flex items-center justify-between">
  <div>
    <p className="text-sm font-medium uppercase tracking-widest text-blue-500">
      Dashboard
    </p>
    <h2 className="text-3xl font-extrabold text-slate-800">
      Packing Checklist
    </h2>
  </div>
</div>

  <div className="mb-4 flex gap-3">
    <input
      className="flex-1 rounded border p-2"
      placeholder="Add packing item..."
      value={newPackingItem}
      onChange={(e) => setNewPackingItem(e.target.value)}
    />

    <button
      onClick={addPackingItem}
      className="rounded bg-green-600 px-4 py-2 text-white"
    >
      Add
    </button>
  </div>

  <div className="space-y-2">
    {packingItems.length === 0 ? (
      <p className="mt-1 text-sm leading-relaxed text-gray-600">No packing items yet.</p>
    ) : (
      packingItems.map((item, index) => (
        <div
          key={index}
          className="flex items-center justify-between rounded border p-3"
        >
          <div className="flex items-center gap-3">
  <input
    type="checkbox"
    checked={item.packed}
    onChange={() => togglePacked(index)}
  />

  <span
    className={
      item.packed
        ? "line-through text-gray-400"
        : ""
    }
  >
    🎒 {item.text}
  </span>
</div>

          <button
            onClick={() => deletePackingItem(index)}
            className="rounded bg-red-600 px-3 py-1 text-sm text-white"
          >
            Delete
          </button>
        </div>
      ))
    )}
  </div>
</div>

<div className="mb-4">
  <div className="mb-2 flex justify-between text-sm">
    <span>Packing Progress</span>
    <span>{packingPercent}%</span>
  </div>

  \<div className="h-4 w-full overflow-hidden rounded-full bg-gray-200">
    <div
      className="h-3 rounded-full bg-green-600"
      style={{
        width: `${packingPercent}%`,
      }}
    />
  </div>
</div>



<div className="mb-6 rounded border bg-purple-50 p-4">
  <h3 className="mb-3 font-semibold">Booking Tracker</h3>

  <div className="grid gap-3 md:grid-cols-5">
    <input
      className="rounded-xl border border-gray-300 bg-white px-4 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
      placeholder="Booking title"
      value={bookingTitle}
      onChange={(e) => setBookingTitle(e.target.value)}
    />

    <select
      className="rounded-xl border border-gray-300 bg-white/90 backdrop-blur-md px-4 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
      value={bookingType}
      onChange={(e) => setBookingType(e.target.value)}
    >
      <option value="hotel">Hotel</option>
      <option value="flight">Flight</option>
      <option value="train">Train</option>
      <option value="bus">Bus</option>
      <option value="activity">Activity</option>
    </select>

    <input
      className="rounded-xl border border-gray-300 bg-white/90 backdrop-blur-md px-4 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
      type="date"
      value={bookingDate}
      onChange={(e) => setBookingDate(e.target.value)}
    />

    <select
      className="rounded-xl border border-gray-300 bg-white/90 backdrop-blur-md px-4 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
      value={bookingStatus}
      onChange={(e) => setBookingStatus(e.target.value)}
    >
      <option value="pending">Pending</option>
      <option value="confirmed">Confirmed</option>
      <option value="cancelled">Cancelled</option>
    </select>

    <input
      className="rounded-xl border border-gray-300 bg-white/90 backdrop-blur-md px-4 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
      placeholder="Reference no."
      value={bookingReference}
      onChange={(e) => setBookingReference(e.target.value)}
    />
  </div>

  <button
    onClick={addBooking}
    className="mt-3 rounded bg-purple-600 px-4 py-2 text-white"
  >
    Add Booking
  </button>

  <div className="mt-4 space-y-2">
    {bookings.length === 0 ? (
     <p className="mt-1 text-sm leading-relaxed text-gray-600">No bookings added yet.</p>
    ) : (
      bookings.map((booking) => (
        <div
          key={booking.id}
          className="flex items-start justify-between rounded border bg-white/90 backdrop-blur-md p-3"
        >
          <div>
            <p className="font-semibold">{booking.title}</p>
            <p className="text-sm text-gray-600">
              {booking.type} | {booking.status}
            </p>
            <p className="text-sm text-gray-600">
              Date: {booking.date || "Not set"}
            </p>
            <p className="text-sm text-gray-600">
              Ref: {booking.reference || "N/A"}
            </p>
          </div>

          <button
            onClick={() => deleteBooking(booking.id)}
            className="rounded bg-red-600 px-3 py-1 text-sm text-white"
          >
            Delete
          </button>
        </div>
      ))
    )}
  </div>
</div>



  <div className="grid gap-4 md:grid-cols-3">
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
      <p className="mt-1 text-sm leading-relaxed text-gray-600">Total Days</p>
      <p className="text-3xl font-extrabold text-slate-800">
        {days.length}</p>
    </div>

    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
      <p className="mt-1 text-sm leading-relaxed text-gray-600">
        Itinerary Items
      </p>
      <p className="text-3xl font-extrabold text-slate-800">{totalItems}</p>
    </div>

    <div className="rounded-2xl border border-gray-100 bg-white/90 backdrop-blur-md p-5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
      <p className="mt-1 text-sm leading-relaxed text-gray-600">Expenses</p>
      <p className="text-3xl font-extrabold text-slate-800">
        {expenses.length}
      </p>
    </div>
    <div className="rounded-2xl border border-gray-100 bg-white/90 backdrop-blur-md p-5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
  <div className="text-sm text-gray-500">

    <div className="mt-3 flex gap-2 flex-wrap">
  <button
    onClick={() =>
      setTripNotes(
        tripNotes +
        "\n\nPacking List:\n- Passport\n- Charger\n- Clothes"
      )
    }
    className="rounded bg-blue-600 px-3 py-1 text-white"
  >
    Packing List
  </button>

  <button
    onClick={() =>
      setTripNotes(
        tripNotes +
        "\n\nThings To Do:\n- "
      )
    }
    className="rounded bg-green-600 px-3 py-1 text-white"
  >
    To-Do List
  </button>
</div>
    Completed Items
  </div>

  <p className="text-3xl font-extrabold text-slate-800">
    {completedCount}
  </p>
</div>
<div className="rounded-2xl border border-gray-100 bg-white/90 backdrop-blur-md p-5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
  <p className="mt-1 text-sm leading-relaxed text-gray-600">
    Completion %
  </p>

  <p className="text-3xl font-extrabold text-slate-800">
    {completionPercent}%
  </p>
</div>

    <div className="rounded-2xl border border-gray-100 bg-white/90 backdrop-blur-md p-5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
      <p className="mt-1 text-sm leading-relaxed text-gray-600">
        Budget Used
      </p>
      <p className="text-3xl font-extrabold text-slate-800">
        {budgetUsedPercent}%
      </p>
    </div>

    <div className="rounded-2xl border border-gray-100 bg-white/90 backdrop-blur-md p-5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
  <p className="mt-1 text-sm leading-relaxed text-gray-600">
    Trip Health Score
  </p>

  <p className="text-3xl font-extrabold text-slate-800">
    {tripHealthScore}/100
  </p>
  <p className="mt-2 text-sm text-gray-600">
  {tripHealthMessage}
</p>
</div>
  </div>
  <div className="mt-6">
  <h3 className="mb-3 text-lg font-semibold">

    <div className="grid gap-4 md:grid-cols-4">
  <div className="rounded-2xl border border-gray-100 bg-white/90 backdrop-blur-md p-5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
    <p className="mt-1 text-sm leading-relaxed text-gray-600">Total Items</p>
    <p className="text-3xl font-extrabold text-slate-800">{totalItems}</p>
  </div>

  <div className="rounded-2xl border border-gray-100 bg-white/90 backdrop-blur-md p-5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
   <p className="mt-1 text-sm leading-relaxed text-gray-600">Completed</p>
    <p className="text-2xl font-bold text-green-600">
      {completedCount}
    </p>
  </div>

  <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
    <p className="mt-1 text-sm leading-relaxed text-gray-600">Favorites</p>
    <p className="text-2xl font-bold text-yellow-600">
      {favoriteItems.length}
    </p>
  </div>

  <div className="rounded-2xl border border-gray-100 bg-white/90 backdrop-blur-md p-5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
    <p className="mt-1 text-sm leading-relaxed text-gray-600">Expenses</p>
    <p className="text-3xl font-extrabold text-slate-800">
      {expenses.length}
    </p>
  </div>
</div>

<div className="rounded-2xl border border-gray-100 bg-white/90 backdrop-blur-md p-5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
 <p className="mt-1 text-sm leading-relaxed text-gray-600">Confirmed Bookings</p>
  <p className="text-3xl font-extrabold text-slate-800">{confirmedBookings}</p>
</div>

<div className="rounded-2xl border border-gray-100 bg-white/90 backdrop-blur-md p-5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
  <p className="mt-1 text-sm leading-relaxed text-gray-600">Pending Bookings</p>
  <p className="text-3xl font-extrabold text-slate-800">{pendingBookings}</p>
</div>

<div className="rounded-2xl border border-gray-100 bg-white/90 backdrop-blur-md p-5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
  <p className="mt-1 text-sm leading-relaxed text-gray-600">Cancelled Bookings</p>
  <p className="text-3xl font-extrabold text-slate-800">{cancelledBookings}</p>
</div>

<div className="rounded-2xl border border-gray-100 bg-white/90 backdrop-blur-md p-5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
 <p className="mt-1 text-sm leading-relaxed text-gray-600">
    Packing Progress
  </p>

  <p className="text-3xl font-extrabold text-slate-800">
    {packingPercent}%
  </p>
</div>
    Expense Category Breakdown
  </h3>

  {Object.keys(expenseByCategory).length === 0 ? (
    <p className="text-gray-500">No expenses yet.</p>
  ) : (
    <div className="grid gap-3 md:grid-cols-3">
      {Object.entries(expenseByCategory).map(
        ([category, amount]) => (
          <div
            key={category}
            className="rounded-3xl border border-gray-100 bg-white/90 backdrop-blur-md p-6 shadow-lg"
          >
            <p className="text-sm capitalize text-gray-500">
              {category}
            </p>

            <p className="text-xl font-bold">
              ₹{amount}
            </p>
          </div>
        )
      )}
    </div>
  )}
</div>
<div className="mt-6">
  <h3 className="mb-3 text-lg font-semibold">
    Daily Activity Count
  </h3>

  <div className="grid gap-3 md:grid-cols-4">
    {dayActivityStats.map((day, index) => (
      <div
        key={index}
        className="rounded-3xl border border-gray-100 bg-white/90 backdrop-blur-md p-6 shadow-lg"
      >
        <p className="mt-1 text-sm leading-relaxed text-gray-600">
          Day {day.day}
        </p>

        <p className="text-3xl font-extrabold text-slate-800">
          {day.count}
        </p>

        <p className="text-xs text-gray-500">
          Activities
        </p>
      </div>
    ))}
  </div>
</div>
</div>

        <div className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-xl backdrop-blur">
          <div className="mb-6 flex items-center justify-between">
  <div>
    <p className="text-sm font-medium uppercase tracking-widest text-blue-500">
      Dashboard
    </p>
    <h2 className="text-3xl font-extrabold text-slate-800">
      AI Trip Planner
    </h2>
  </div>
</div>

          <textarea
            className="mb-4 w-full rounded border p-3"
            rows={3}
            placeholder="Example: beaches, cafes, nightlife, vegetarian food, budget friendly"
            value={aiPreferences}
            onChange={(e) => setAiPreferences(e.target.value)}
          />

          <div className="flex flex-wrap gap-3">
            <button
              onClick={generateAiPlan}
              disabled={isGenerating}
              className="rounded bg-purple-600 px-4 py-2 text-white disabled:bg-gray-400"
            >
              {isGenerating ? "Generating Plan..." : "Generate AI Text Plan"}
            </button>

            <button
              onClick={generateAndSaveAiItems}
              disabled={isSavingAiItems}
              className="rounded bg-indigo-600 px-4 py-2 text-white disabled:bg-gray-400"
            >
              {isSavingAiItems
                ? "Creating Items..."
                : "Generate & Save AI Itinerary"}
            </button>

            <button
              onClick={generateBudgetBreakdown}
              disabled={isGeneratingBudget}
              className="rounded bg-green-600 px-4 py-2 text-white disabled:bg-gray-400"
            >
              {isGeneratingBudget
                ? "Generating Budget..."
                : "Generate Budget Breakdown"}
            </button>

            <button
              onClick={fetchWeather}
              disabled={isLoadingWeather}
              className="rounded bg-sky-600 px-4 py-2 text-white disabled:bg-gray-400"
            >
              {isLoadingWeather ? "Loading Weather..." : "Get Weather Forecast"}
            </button>

            <button
              onClick={fetchNearbyAttractions}
              disabled={isLoadingAttractions}
              className="rounded bg-orange-600 px-4 py-2 text-white disabled:bg-gray-400"
            >
              {isLoadingAttractions
                ? "Finding Attractions..."
                : "Find Nearby Attractions"}
            </button>

            <button
              onClick={fetchHotels}
              disabled={isLoadingHotels}
              className="rounded bg-pink-600 px-4 py-2 text-white disabled:bg-gray-400"
            >
              {isLoadingHotels ? "Finding Hotels..." : "Find Hotels"}
            </button>

            <button
              onClick={fetchRestaurants}
              disabled={isLoadingRestaurants}
              className="rounded bg-amber-600 px-4 py-2 text-white disabled:bg-gray-400"
            >
              {isLoadingRestaurants
                ? "Finding Restaurants..."
                : "Find Restaurants"}
            </button>

            <button
  onClick={fetchProgressRecommendations}
  disabled={isLoadingProgressRecommendations}
  className="rounded bg-teal-600 px-4 py-2 text-white disabled:bg-gray-400"
>
  {isLoadingProgressRecommendations
    ? "Generating Recommendations..."
    : "Progress Recommendations"}
</button>
          </div>

          {aiPlan && (
            <div className="mt-6 whitespace-pre-wrap rounded border bg-gray-50 p-4 text-sm leading-6">
              {aiPlan}
            </div>
          )}

          {budgetBreakdown && (
            <div className="mt-6 rounded border bg-green-50 p-4">
              <h3 className="mb-3 text-lg font-bold">AI Budget Breakdown</h3>

              <div className="grid gap-3 md:grid-cols-2">
                <p>🏨 Hotel: ₹{budgetBreakdown.hotel}</p>
                <p>🍽 Food: ₹{budgetBreakdown.food}</p>
                <p>🚕 Transport: ₹{budgetBreakdown.transport}</p>
                <p>🎟 Activities: ₹{budgetBreakdown.activities}</p>
                <p>🛍 Shopping: ₹{budgetBreakdown.shopping}</p>
              </div>
            </div>
          )}

          {weather && (
            <div className="mt-6 rounded border bg-sky-50 p-4">
              <h3 className="mb-3 text-lg font-bold">
                Weather Forecast for {weather.location}
              </h3>

              <div className="grid gap-3 md:grid-cols-2">
                {weather.daily.time.map((date: string, index: number) => (
                  <div key={date} className="rounded bg-white p-3 shadow-sm">
                    <p className="font-semibold">
                      {new Date(date).toLocaleDateString()}
                    </p>
                    <p>🌡 Max: {weather.daily.temperature_2m_max[index]}°C</p>
                    <p>❄ Min: {weather.daily.temperature_2m_min[index]}°C</p>
                    <p>
                      🌧 Rain Chance:{" "}
                      {weather.daily.precipitation_probability_max[index]}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {attractions.length > 0 && (
            <div className="mt-6 rounded border bg-orange-50 p-4">
              <h3 className="mb-3 text-lg font-bold">Nearby Attractions</h3>

              <div className="grid gap-3 md:grid-cols-2">
                {attractions.map((place, index) => (
                  <div key={index} className="rounded bg-white p-4 shadow-sm">
                    <h4 className="text-lg font-bold text-slate-800">{place.name}</h4>
                    <p className="text-sm text-gray-600">Type: {place.type}</p>
                    <p className="mt-2 text-sm">{place.description}</p>
                    <p className="mt-2 text-sm">Best Time: {place.bestTime}</p>
                    <p className="text-sm">
                      Estimated Cost: ₹{place.estimatedCost}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hotels.length > 0 && (
            <div className="mt-6 rounded border bg-pink-50 p-4">
              <h3 className="mb-3 text-lg font-bold">Hotel Recommendations</h3>

              <div className="grid gap-3 md:grid-cols-2">
                {hotels.map((hotel, index) => (
                  <div key={index} className="rounded bg-white p-4 shadow-sm">
                    <h4 className="text-lg font-bold text-slate-800">{hotel.name}</h4>
                    <p className="text-sm text-gray-600">Area: {hotel.area}</p>
                    <p className="text-sm">
                      Price/Night: ₹{hotel.pricePerNight}
                    </p>
                    <p className="text-sm">Rating: ⭐ {hotel.rating}</p>
                    <p className="text-sm">Best For: {hotel.bestFor}</p>
                    <p className="mt-2 text-sm">{hotel.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {restaurants.length > 0 && (
            <div className="mt-6 rounded border bg-amber-50 p-4">
              <h3 className="mb-3 text-lg font-bold">
                Restaurant Recommendations
              </h3>

              <div className="grid gap-3 md:grid-cols-2">
                {restaurants.map((restaurant, index) => (
                  <div key={index} className="rounded bg-white p-4 shadow-sm">
                    <h4 className="text-lg font-bold text-slate-800">{restaurant.name}</h4>
                    <p className="text-sm text-gray-600">
                      Area: {restaurant.area}
                    </p>
                    <p className="text-sm">Cuisine: {restaurant.cuisine}</p>
                    <p className="text-sm">
                      Price for Two: ₹{restaurant.priceForTwo}
                    </p>
                    <p className="text-sm">
                      Best Dish: {restaurant.bestDish}
                    </p>
                    <p className="mt-2 text-sm">{restaurant.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 rounded border bg-violet-50 p-4">
            <h3 className="mb-3 text-lg font-bold">AI Travel Chatbot</h3>

            <textarea
              className="mb-3 w-full rounded border p-3"
              rows={3}
              placeholder="Ask something like: What should I do on Day 2?"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
            />

            <button
              onClick={askTravelChatbot}
              disabled={isChatLoading}
              className="rounded bg-violet-600 px-4 py-2 text-white disabled:bg-gray-400"
            >
              {isChatLoading ? "Thinking..." : "Ask AI"}
            </button>

            {chatReply && (
              <div className="mt-4 whitespace-pre-wrap rounded bg-white p-4 text-sm shadow-sm">
                {chatReply}
              </div>
            )}
            {progressRecommendations.length > 0 && (
  <div className="mt-6 rounded border bg-teal-50 p-4">
    <h3 className="mb-3 text-lg font-bold">
      AI Progress Recommendations
    </h3>

    <div className="grid gap-3 md:grid-cols-2">
      {progressRecommendations.map((rec, index) => (
        <div
          key={index}
          className="rounded bg-white p-4 shadow-sm"
        >
          <h4 className="text-lg font-bold text-slate-800">
            {rec.title}
          </h4>

          <p className="text-sm text-gray-600">
            Type: {rec.type}
          </p>

          <p className="mt-2 text-sm">
            {rec.reason}
          </p>
        </div>
      ))}
    </div>
  </div>
)}
          </div>
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-xl backdrop-blur">
          <div className="mb-6 flex items-center justify-between">
  <div>
    <p className="text-sm font-medium uppercase tracking-widest text-blue-500">
      Dashboard
    </p>
    <h2 className="text-3xl font-extrabold text-slate-800">
      Expense Tracker
    </h2>
  </div>
</div>

          <div className="mb-6 grid gap-3 md:grid-cols-4">
            <input
              className="rounded border p-3"
              placeholder="Expense title"
              value={expenseTitle}
              onChange={(e) => setExpenseTitle(e.target.value)}
            />

            <select
              className="rounded border p-3"
              value={expenseCategory}
              onChange={(e) => setExpenseCategory(e.target.value)}
            >
              <option value="food">Food</option>
              <option value="hotel">Hotel</option>
              <option value="transport">Transport</option>
              <option value="activity">Activity</option>
              <option value="shopping">Shopping</option>
              <option value="other">Other</option>
            </select>

            

            <input
              className="rounded border p-3"
              placeholder="Amount"
              type="number"
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value)}
            />

            <button
              onClick={createExpense}
              className="rounded bg-emerald-600 p-3 text-white"
            >
              Add Expense
            </button>
          </div>

          <div className="mb-4 rounded border bg-gray-50 p-4">
            <p className="font-semibold">Total Spent: ₹{totalSpent}</p>
            <p className="text-sm text-gray-600">
              Remaining Budget: ₹{trip.budget - totalSpent}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {expenses.length === 0 ? (
              <p className="text-gray-500">No expenses added yet.</p>
            ) : (
              expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-start justify-between rounded border p-4"
                >
                  <div>
                    <h4 className="text-lg font-bold text-slate-800">{expense.title}</h4>
                    <p className="text-sm text-gray-600">
                      Category: {expense.category}
                    </p>
                    <p className="text-sm text-gray-600">
                      Amount: ₹{expense.amount}
                    </p>
                  </div>

                  <button
                    onClick={() => deleteExpense(expense.id)}
                    className="rounded bg-red-600 px-3 py-1 text-sm text-white"
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-xl backdrop-blur">
          <h2 className="mb-4 text-2xl font-semibold">Collaborators</h2>

          <div className="mb-6 flex flex-col gap-3 rounded border p-4">
            <select
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">Select User</option>

              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>

            <select
              className="rounded-xl border border-gray-300 bg-white/90 backdrop-blur-md px-4 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>

            <button
              onClick={inviteCollaborator}
              className="rounded bg-green-600 p-2 text-white"
            >
              Invite Collaborator
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {trip.owner && (
              <div className="rounded-2xl border border-gray-100 bg-white/90 backdrop-blur-md p-5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
                <p className="font-semibold">{trip.owner.name}</p>
                <p className="text-sm text-gray-600">{trip.owner.email}</p>
                <p className="text-sm font-medium text-blue-600">Owner</p>
              </div>
            )}

            {collaborators.length === 0 ? (
              <p className="text-gray-500">No collaborators added yet.</p>
            ) : (
              collaborators.map((collab) => (
                <div
                  key={collab.id}
                  className="flex items-start justify-between rounded border p-4"
                >
                  <div>
                    <p className="font-semibold">{collab.user.name}</p>
                    <p className="text-sm text-gray-600">
                      {collab.user.email}
                    </p>

                    <select
                      className="mt-2 rounded border p-2 text-sm"
                      value={collab.role}
                      onChange={(e) =>
                        updateCollaboratorRole(collab.id, e.target.value)
                      }
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>
                  </div>

                  <button
                    onClick={() => removeCollaborator(collab.id)}
                    className="rounded bg-red-600 px-3 py-1 text-sm text-white"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <section className="rounded-xl bg-white/90 backdrop-blur-md p-6 shadow">
            <h2 className="mb-4 text-2xl font-semibold">Create Day</h2>

            <div className="mb-8 flex flex-col gap-4">
              <input
                className="rounded border p-3"
                placeholder="Day number"
                type="number"
                value={newDayNumber}
                onChange={(e) => setNewDayNumber(e.target.value)}
              />

              <input
                className="rounded border p-3"
                type="date"
                value={newDayDate}
                onChange={(e) => setNewDayDate(e.target.value)}
              />

              <button
                onClick={createDay}
                className="rounded bg-blue-600 p-3 text-white"
              >
                Create Day
              </button>
            </div>

            <h2 className="mb-4 text-2xl font-semibold">Add Item</h2>

            <div className="flex flex-col gap-4">
              <select
                className="rounded border p-3"
                value={selectedDayId}
                onChange={(e) => setSelectedDayId(e.target.value)}
              >
                {days.map((day) => (
                  <option key={day.id} value={day.id}>
                    🗓️ Day {day.dayNumber} -{" "}
                    {new Date(day.date).toLocaleDateString()}
                  </option>
                ))}
              </select>

              <input
                className="rounded border p-3"
                placeholder="Item title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <select
                className="rounded border p-3"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="activity">Activity</option>
                <option value="hotel">Hotel</option>
                <option value="food">Food</option>
                <option value="travel">Travel</option>
              </select>

              <input
                className="rounded border p-3"
                placeholder="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />

              <input
                className="rounded border p-3"
                placeholder="Cost"
                type="number"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />

              <button
                onClick={createItem}
                className="rounded bg-black p-3 text-white"
              >
                Add Item
              </button>
            </div>
          </section>

          <section className="md:col-span-2">
            <h2 className="mb-4 text-2xl font-semibold">Itinerary</h2>
            <input
  className="mb-4 w-full rounded border p-3"
  placeholder="Search itinerary by title, type, or location..."
  value={itinerarySearch}
  onChange={(e) => setItinerarySearch(e.target.value)}
/>
<select
  className="mb-4 w-full rounded border p-3"
  value={itineraryTypeFilter}
  onChange={(e) => setItineraryTypeFilter(e.target.value)}
>
  <option value="all">All Types</option>
  <option value="activity">Activity</option>
  <option value="hotel">Hotel</option>
  <option value="food">Food</option>
  <option value="travel">Travel</option>
</select>
<button
  onClick={() => {
    setItinerarySearch("");
    setItineraryTypeFilter("all");
  }}
  className="mb-4 rounded bg-gray-700 px-4 py-2 text-white"
>
  Clear Filters
</button>
<select
  className="mb-4 w-full rounded border p-3"
  value={itinerarySort}
  onChange={(e) => setItinerarySort(e.target.value)}
>
  <option value="default">Default Order</option>
  <option value="title-asc">Title A → Z</option>
  <option value="title-desc">Title Z → A</option>
</select>

<label className="mb-4 flex items-center gap-2">
  <input
    type="checkbox"
    checked={showFavoritesOnly}
    onChange={(e) =>
      setShowFavoritesOnly(e.target.checked)
    }
  />
  Show Favorites Only
</label>

<button
  onClick={() => {
    setFavoriteItems([]);
    setShowFavoritesOnly(false);
  }}
  className="mb-4 rounded bg-yellow-600 px-4 py-2 text-white"
>
  Reset Favorites
</button>
            <div className="flex flex-col gap-4">
              {days.length === 0 ? (
                <p className="rounded bg-white/90 backdrop-blur-md p-6 text-gray-500 shadow">
                  No itinerary days created yet.
                </p>
              ) : (
                days.map((day) => (
                  <div key={day.id} className="rounded-xl bg-white/90 backdrop-blur-md p-6 shadow">
                    <h3 className="text-xl font-bold">
                      🗓️ Day {day.dayNumber} -{" "}
                      {new Date(day.date).toLocaleDateString()}
                    </h3>

                    <div className="mt-4">
                      {(itemsByDay[day.id] || []).length === 0 ? (
                        <p className="text-gray-500">No items added yet.</p>
                      ) : (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(event) => handleDragEnd(day.id, event)}
                        >
                          <SortableContext
                            items={(itemsByDay[day.id] || []).map(
                              (item) => item.id
                            )}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="flex flex-col gap-3">
                             {(itemsByDay[day.id] || [])
  .filter((item) => {
  const matchesSearch =
    `${item.title} ${item.type} ${item.location || ""}`
      .toLowerCase()
      .includes(itinerarySearch.toLowerCase());

  const matchesType =
    itineraryTypeFilter === "all" ||
    item.type === itineraryTypeFilter;

  const matchesFavorite =
  !showFavoritesOnly ||
  favoriteItems.includes(item.id);

return (
  matchesSearch &&
  matchesType &&
  matchesFavorite
);
})
.sort((a, b) => {
  if (itinerarySort === "title-asc") {
    return a.title.localeCompare(b.title);
  }

  if (itinerarySort === "title-desc") {
    return b.title.localeCompare(a.title);
  }

  return 0;
})
.map((item) => (
    <SortableItineraryItem
  key={item.id}
  item={item}
  onDelete={() => deleteItem(item.id)}
  toggleFavorite={toggleFavorite}
  favoriteItems={favoriteItems}
  completedItems={completedItems}
  toggleCompleted={toggleCompleted}
/>
  ))}
  </div>

<div className="mt-6 rounded-xl bg-white/90 backdrop-blur-md p-6 shadow">
 <div className="mb-6 flex items-center justify-between">
  <div>
    <p className="text-sm font-medium uppercase tracking-widest text-blue-500">
      Dashboard
    </p>
    <h2 className="text-3xl font-extrabold text-slate-800">
      Trip Timeline
    </h2>
  </div>
</div>

  {days.length === 0 ? (
    <p className="text-gray-500">No timeline available yet.</p>
  ) : (
    <div className="space-y-6">
      {days.map((day) => (
        <div key={day.id} className="border-l-4 border-blue-600 pl-4">
          <h3 className="mb-3 font-bold">
            🗓️ Day {day.dayNumber}
          </h3>

          {(itemsByDay[day.id] || []).length === 0 ? (
            <p className="mt-1 text-sm leading-relaxed text-gray-600">No activities.</p>
          ) : (
            <div className="space-y-3">
              {(itemsByDay[day.id] || []).map((item) => (
                <div key={item.id} className="rounded border p-3">
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-gray-600">
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
  {item.type}
</span>
                    {item.location ? ` • ${item.location}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )}
</div>
  
                          </SortableContext>
                        </DndContext>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
