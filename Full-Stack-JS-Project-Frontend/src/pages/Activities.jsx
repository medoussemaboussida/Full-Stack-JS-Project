import React, { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart as faHeartSolid } from "@fortawesome/free-solid-svg-icons";
import { faHeart as faHeartRegular } from "@fortawesome/free-regular-svg-icons";
import {
  faTrash,
  faChevronLeft,
  faChevronRight,
  faPlus,
  faTimes,
  faThumbtack,
  faRandom,
  faQuestionCircle,
} from "@fortawesome/free-solid-svg-icons";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Function to strip HTML tags
const stripHtmlTags = (html) => {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;
  return tempDiv.textContent || tempDiv.innerText || "";
};

function Activities() {
  const [userRole, setUserRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [activities, setActivities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("*");
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [favoriteActivities, setFavoriteActivities] = useState([]);
  const [pinnedActivities, setPinnedActivities] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [moods, setMoods] = useState([]);
  const [scheduledActivities, setScheduledActivities] = useState({});
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showSlotMachineModal, setShowSlotMachineModal] = useState(false);
  const [proposedActivities, setProposedActivities] = useState([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showForumRulesModal, setShowForumRulesModal] = useState(false);
  const itemsPerPage = 8;
  const navigate = useNavigate();

  const moodValues = { "Very Sad": 1, Sad: 2, Neutral: 3, Happy: 4, "Very Happy": 5 };
  const moodColors = {
    "Very Sad": "#ff4d4f",
    Sad: "#ff7875",
    Neutral: "#d3d3d3",
    Happy: "#69c0ff",
    "Very Happy": "#40a9ff",
  };
  const satisfactionColors = {
    Satisfied: "#40a9ff",
    NotSatisfied: "#ff7875",
    NeutralOrUnspecified: "#d3d3d3",
  };

  // Fetch categories and filter based on activities
  useEffect(() => {
    const fetchCategoriesAndFilter = async () => {
      try {
        const token = localStorage.getItem("jwt-token");
        const categoriesResponse = await fetch("http://localhost:5000/users/categories", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const categoriesData = await categoriesResponse.json();

        const activitiesResponse = await fetch("http://localhost:5000/users/list/activities", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const activitiesData = await activitiesResponse.json();

        if (categoriesResponse.ok && activitiesResponse.ok) {
          const usedCategoryIds = new Set(
            activitiesData
              .filter((activity) => activity.category && activity.category._id && !activity.isArchived)
              .map((activity) => activity.category._id)
          );

          const mappedCategories = Array.isArray(categoriesData)
            ? [
                { label: "All", value: "*" },
                ...categoriesData
                  .filter((cat) => usedCategoryIds.has(cat._id))
                  .map((cat) => ({
                    label: cat.name || "Unnamed Category",
                    value: cat._id || cat.id,
                  })),
              ]
            : [{ label: "All", value: "*" }];

          setCategories(mappedCategories);
          setActivities(activitiesData);
        } else {
          console.error("Failed to fetch data:", categoriesData.message || activitiesData.message);
          setCategories([{ label: "All", value: "*" }]);
          toast.error("Failed to load categories or activities");
        }
      } catch (error) {
        console.error("Error fetching categories or activities:", error);
        setCategories([{ label: "All", value: "*" }]);
        toast.error("Error connecting to server while fetching data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchCategoriesAndFilter();
  }, []);

  const fetchFavoriteActivities = async (userId) => {
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token || !userId) return;
      const response = await fetch(`http://localhost:5000/users/favorite-activities/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) setFavoriteActivities(data.favoriteActivities || []);
      else console.error("Failed to fetch favorite activities:", data.message);
    } catch (error) {
      console.error("Error fetching favorite activities:", error);
    }
  };

  const fetchPinnedActivities = async (userId) => {
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token || !userId) return;
      const response = await fetch(`http://localhost:5000/users/pinned-activities/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) setPinnedActivities(data.pinnedActivities || []);
      else console.error("Failed to fetch pinned activities:", data.message);
    } catch (error) {
      console.error("Error fetching pinned activities:", error);
    }
  };

  const fetchMoods = async (userId) => {
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token || !userId) return;
      const response = await fetch(`http://localhost:5000/users/moods/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) setMoods(data || []);
      else console.error("Failed to fetch moods:", data.message);
    } catch (error) {
      console.error("Error fetching moods:", error);
    }
  };

  const fetchScheduledActivities = async (userId) => {
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token || !userId) return;
      const response = await fetch(`http://localhost:5000/users/schedule/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) setScheduledActivities(data.schedules || {});
      else console.error("Failed to fetch scheduled activities:", data.message);
    } catch (error) {
      console.error("Error fetching scheduled activities:", error);
    }
  };

  const toggleFavoriteActivity = async (activityId) => {
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token || !userId) {
        toast.error("You must be logged in!");
        return;
      }
      const response = await fetch(`http://localhost:5000/users/favorite-activity/${userId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ activity: activityId }),
      });
      const data = await response.json();
      if (response.ok) {
        const isFavorite = favoriteActivities.includes(activityId);
        setFavoriteActivities((prev) => (isFavorite ? prev.filter((id) => id !== activityId) : [...prev, activityId]));
        toast.success(`Activity ${isFavorite ? "removed from" : "added to"} favorites!`);
      } else {
        toast.error(`Failed to toggle favorite: ${data.message}`);
      }
    } catch (error) {
      console.error("Error toggling favorite activity:", error);
      toast.error("An error occurred while toggling the favorite.");
    }
  };

  const togglePinActivity = async (activityId) => {
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token || !userId) {
        toast.error("You must be logged in!");
        return;
      }
      const response = await fetch(`http://localhost:5000/users/pin-activity/${userId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ activity: activityId }),
      });
      const data = await response.json();
      if (response.ok) {
        const isPinned = pinnedActivities.includes(activityId);
        setPinnedActivities((prev) => (isPinned ? prev.filter((id) => id !== activityId) : [...prev, activityId]));
        toast.success(`Activity ${isPinned ? "unpinned" : "pinned"} successfully!`);
      } else {
        toast.error(`Failed to toggle pin: ${data.message}`);
      }
    } catch (error) {
      console.error("Error toggling pinned activity:", error);
      toast.error("An error occurred while toggling the pin.");
    }
  };

  const handleEdit = (activity) => {
    navigate(`/edit-activity/${activity._id}`, { state: { imageUrl: activity.imageUrl } });
  };

  const handleDelete = (activityId) => {
    setActivityToDelete(activityId);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async (activityId) => {
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token) {
        toast.error("You must be logged in!");
        return;
      }
      const response = await fetch(
        `http://localhost:5000/users/psychiatrist/${userId}/delete-activity/${activityId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        }
      );
      const data = await response.json();
      if (response.ok) {
        setActivities(activities.filter((activity) => activity._id !== activityId));
        const usedCategoryIds = new Set(
          activities
            .filter((activity) => activity._id !== activityId && !activity.isArchived)
            .filter((activity) => activity.category && activity.category._id)
            .map((activity) => activity.category._id)
        );
        setCategories((prev) => [
          { label: "All", value: "*" },
          ...prev
            .filter((cat) => cat.value !== "*" && usedCategoryIds.has(cat.value))
            .map((cat) => ({ label: cat.label, value: cat.value })),
        ]);
        toast.success("Activity deleted successfully!");
      } else {
        toast.error(`Failed to delete activity: ${data.message}`);
      }
    } catch (error) {
      console.error("Error deleting activity:", error);
      toast.error("An error occurred while deleting the activity.");
    }
    closeDeleteModal();
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setActivityToDelete(null);
  };

  const handleViewActivityModal = (activity) => {
    setSelectedActivity(activity);
    setShowModal(true);
  };

  const closeViewActivityModal = () => {
    setShowModal(false);
    setSelectedActivity(null);
  };

  const fetchActivitiesByCategory = async (categoryId) => {
    setIsLoading(true);
    setCurrentPage(1);
    try {
      const token = localStorage.getItem("jwt-token");
      let url = "http://localhost:5000/users/list/activities";
      if (categoryId !== "*") {
        url = `http://localhost:5000/users/activities/category?category=${encodeURIComponent(categoryId)}`;
      }
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setActivities(data.filter((activity) => !activity.isArchived));
      } else {
        console.error("Error fetching activities by category:", data.message);
        toast.error("Failed to fetch activities for this category");
      }
    } catch (error) {
      console.error("Connection error:", error);
      toast.error("Error connecting to server");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddActivity = () => {
    navigate("/add-activity");
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setCurrentPage(1);
  };

  const navigateToActivitySchedule = () => {
    navigate("/activity-schedule");
  };

  const handleOpenStatsModal = () => {
    if (userId) {
      fetchMoods(userId);
      fetchScheduledActivities(userId);
    }
    setShowStatsModal(true);
  };

  const closeStatsModal = () => {
    setShowStatsModal(false);
  };

  const recommendActivities = () => {
    const moodImpact = calculateMoodImpact();
    const satisfactionData = calculateSatisfactionDistribution();

    // Calculate scores for each activity
    const scoredActivities = activities
      .filter((activity) => !activity.isArchived)
      .map((activity) => {
        const moodScore = moodImpact[activity._id]?.average || 3; // Default to neutral if no mood data
        const satisfactionScore =
          satisfactionData[activity._id]?.satisfied / (satisfactionData[activity._id]?.totalMoods || 1) || 0.5; // Default to 0.5 if no satisfaction data
        const favoriteBonus = favoriteActivities.includes(activity._id) ? 1 : 0;
        const pinnedBonus = pinnedActivities.includes(activity._id) ? 1 : 0;
        const score =
          moodScore * 0.4 + satisfactionScore * 0.3 + favoriteBonus * 0.2 + pinnedBonus * 0.1 + Math.random() * 0.2;
        return { ...activity, score };
      });

    // Sort by score and select top 4
    scoredActivities.sort((a, b) => b.score - a.score);
    const topActivities = scoredActivities.slice(0, 4);

    // If less than 4 activities, fill with random ones
    if (topActivities.length < 4) {
      const remaining = activities
        .filter((activity) => !activity.isArchived && !topActivities.includes(activity))
        .sort(() => Math.random() - 0.5)
        .slice(0, 4 - topActivities.length);
      return [...topActivities, ...remaining];
    }

    return topActivities;
  };

  const handleProposeActivities = () => {
    if (userId) {
      fetchMoods(userId);
      fetchScheduledActivities(userId);
    }
    setShowSlotMachineModal(true);
    setIsSpinning(true);
    setProposedActivities([]);

    // Simulate slot machine spinning
    setTimeout(() => {
      const selectedActivities = recommendActivities();
      setProposedActivities(selectedActivities);
      setIsSpinning(false);
    }, 2000); // 2 seconds spinning
  };

  const closeSlotMachineModal = () => {
    setShowSlotMachineModal(false);
    setProposedActivities([]);
    setIsSpinning(false);
  };

  // Generate a list of activities for each reel during spinning
  const generateReelActivities = (finalActivity, reelIndex) => {
    if (!finalActivity) return [];

    // Shuffle non-archived activities and take 9 random ones, then append the final activity
    const shuffledActivities = activities
      .filter((activity) => !activity.isArchived && activity._id !== finalActivity._id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 9);

    // Ensure the final activity is at the end
    return [...shuffledActivities, finalActivity];
  };

  const calculateMoodImpact = () => {
    const moodImpact = {};
    activities
      .filter((activity) => !activity.isArchived)
      .forEach((activity) => {
        moodImpact[activity._id] = { title: activity.title, moods: [], average: 0 };
      });
    moods.forEach((mood) => {
      if (mood.activityId && mood.activityId._id) {
        const activityId = mood.activityId._id;
        if (moodImpact[activityId]) {
          moodImpact[activityId].moods.push(moodValues[mood.mood]);
        }
      }
    });
    Object.keys(moodImpact).forEach((activityId) => {
      const moods = moodImpact[activityId].moods;
      if (moods.length > 0) {
        moodImpact[activityId].average = moods.reduce((sum, value) => sum + value, 0) / moods.length;
      }
    });
    return moodImpact;
  };

  const calculateSatisfactionDistribution = () => {
    const satisfactionData = {};
    activities
      .filter((activity) => !activity.isArchived)
      .forEach((activity) => {
        satisfactionData[activity._id] = {
          title: activity.title,
          satisfied: 0,
          notSatisfied: 0,
          neutralOrUnspecified: 0,
          totalMoods: 0,
        };
      });
    moods.forEach((mood) => {
      if (mood.activityId && mood.activityId._id) {
        const activityId = mood.activityId._id;
        if (satisfactionData[activityId]) {
          satisfactionData[activityId].totalMoods += 1;
          if (mood.mood === "Happy" || mood.mood === "Very Happy") satisfactionData[activityId].satisfied += 1;
          else if (mood.mood === "Sad" || mood.mood === "Very Sad") satisfactionData[activityId].notSatisfied += 1;
          else satisfactionData[activityId].neutralOrUnspecified += 1;
        }
      }
    });
    return satisfactionData;
  };

  const prepareMoodChartData = () => {
    const moodImpact = calculateMoodImpact();
    const labels = [];
    const data = [];
    const backgroundColors = [];
    Object.keys(moodImpact).forEach((activityId) => {
      if (moodImpact[activityId].moods.length > 0) {
        labels.push(moodImpact[activityId].title);
        data.push(moodImpact[activityId].average);
        const avg = moodImpact[activityId].average;
        let color =
          avg <= 1.5
            ? moodColors["Very Sad"]
            : avg <= 2.5
            ? moodColors["Sad"]
            : avg <= 3.5
            ? moodColors["Neutral"]
            : avg <= 4.5
            ? moodColors["Happy"]
            : moodColors["Very Happy"];
        backgroundColors.push(color);
      }
    });
    return {
      labels,
      datasets: [
        { label: "Average Mood Impact", data, backgroundColor: backgroundColors, borderColor: backgroundColors, borderWidth: 1 },
      ],
    };
  };

  const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();

  const prepareActivityCompletionChartData = (scheduledActivities, currentMonth) => {
    console.log("Scheduled Activities:", JSON.stringify(scheduledActivities, null, 2));

    if (!currentMonth || !(currentMonth instanceof Date) || isNaN(currentMonth.getTime())) {
      console.warn("Invalid currentMonth, defaulting to current date");
      currentMonth = new Date();
    }
    console.log("Current Month:", currentMonth.toISOString());

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(month, year);
    const labels = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
    const completedData = new Array(daysInMonth).fill(0);
    const incompleteData = new Array(daysInMonth).fill(0);
    let hasData = false;

    if (!scheduledActivities || Object.keys(scheduledActivities).length === 0) {
      console.warn("No scheduled activities available for chart");
      return {
        labels,
        datasets: [
          {
            label: "Completed Activities (%)",
            data: completedData,
            borderColor: "#40a9ff",
            backgroundColor: "rgba(64, 169, 255, 0.2)",
            fill: true,
            tension: 0.4,
          },
          {
            label: "Incomplete Activities (%)",
            data: incompleteData,
            borderColor: "#ff7875",
            backgroundColor: "rgba(255, 120, 117, 0.2)",
            fill: true,
            tension: 0.4,
          },
        ],
        hasData,
      };
    }

    Object.keys(scheduledActivities).forEach((date) => {
      try {
        const scheduleDate = new Date(date);
        if (isNaN(scheduleDate.getTime())) {
          console.warn(`Invalid date format: ${date}`);
          return;
        }

        if (scheduleDate.getMonth() === month && scheduleDate.getFullYear() === year) {
          const dayIndex = scheduleDate.getDate() - 1;
          const activitiesForDate = scheduledActivities[date]?.activities || [];
          const totalActivities = activitiesForDate.length;

          console.log(`Date: ${date}, Activities:`, activitiesForDate);

          if (totalActivities > 0) {
            const completedCount = activitiesForDate.filter((activity) => activity.completed).length;
            const incompleteCount = totalActivities - completedCount;
            completedData[dayIndex] = (completedCount / totalActivities) * 100;
            incompleteData[dayIndex] = (incompleteCount / totalActivities) * 100;
            hasData = true;
          }
        }
      } catch (error) {
        console.error(`Error processing date ${date}:`, error);
      }
    });

    console.log("Completed Data:", completedData);
    console.log("Incomplete Data:", incompleteData);

    return {
      labels,
      datasets: [
        {
          label: "Completed Activities (%)",
          data: completedData,
          borderColor: "#40a9ff",
          backgroundColor: "rgba(64, 169, 255, 0.2)",
          fill: true,
          tension: 0.4,
        },
        {
          label: "Incomplete Activities (%)",
          data: incompleteData,
          borderColor: "#ff7875",
          backgroundColor: "rgba(255, 120, 117, 0.2)",
          fill: true,
          tension: 0.4,
        },
      ],
      hasData,
    };
  };

  const prepareSatisfactionChartData = (satisfactionData) => {
    const { satisfied, notSatisfied, neutralOrUnspecified } = satisfactionData;
    const total = satisfied + notSatisfied + neutralOrUnspecified;
    if (total === 0) {
      return {
        labels: ["No Data"],
        datasets: [{ data: [100], backgroundColor: [satisfactionColors.NeutralOrUnspecified], borderWidth: 0 }],
      };
    }
    return {
      labels: ["Satisfied", "Not Satisfied", "Neutral"],
      datasets: [
        {
          data: [satisfied, notSatisfied, neutralOrUnspecified],
          backgroundColor: [
            satisfactionColors.Satisfied,
            satisfactionColors.NotSatisfied,
            satisfactionColors.NeutralOrUnspecified,
          ],
          borderWidth: 0,
        },
      ],
    };
  };

  const handlePreviousMonth = () => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1));
  const handleNextMonth = () => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1));

  const handleOpenForumRulesModal = () => {
    setShowForumRulesModal(true);
  };

  const closeForumRulesModal = () => {
    setShowForumRulesModal(false);
  };

  useEffect(() => {
    const token = localStorage.getItem("jwt-token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.id) setUserId(decoded.id);
        if (decoded.role) setUserRole(decoded.role);
        fetchFavoriteActivities(decoded.id);
        fetchPinnedActivities(decoded.id);
      } catch (error) {
        console.error("Invalid token:", error);
      }
    }
  }, []);

  useEffect(() => {
    fetchActivitiesByCategory(selectedCategory);
  }, [selectedCategory]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredActivities = activities
    .filter((activity) => {
      const matchesCategory =
        selectedCategory === "*" || (activity.category && activity.category._id === selectedCategory);
      const matchesSearch =
        !searchTerm ||
        stripHtmlTags(activity.title).toLowerCase().includes(searchTerm.toLowerCase()) ||
        stripHtmlTags(activity.description).toLowerCase().includes(searchTerm.toLowerCase());
      const isNotArchived = !activity.isArchived;
      return matchesCategory && matchesSearch && isNotArchived;
    })
    .sort((a, b) =>
      pinnedActivities.includes(a._id) === pinnedActivities.includes(b._id)
        ? 0
        : pinnedActivities.includes(a._id)
        ? -1
        : 1
    );

  const totalActivities = filteredActivities.length;
  const totalPages = Math.ceil(totalActivities / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentActivities = filteredActivities.slice(startIndex, endIndex);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (isLoading) return <div style={{ textAlign: "center", padding: "20px", fontSize: "18px" }}>Loading...</div>;

  const moodChartData = prepareMoodChartData();
  const activityCompletionChartData = prepareActivityCompletionChartData(scheduledActivities, currentMonth);
  const satisfactionData = calculateSatisfactionDistribution();

  const moodChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "Impact of Activities on Psychological State", font: { size: 20 } },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw;
            let moodLabel =
              value <= 1.5
                ? "Very Sad"
                : value <= 2.5
                ? "Sad"
                : value <= 3.5
                ? "Neutral"
                : value <= 4.5
                ? "Happy"
                : "Very Happy";
            return `Average Mood: ${moodLabel} (${value.toFixed(2)})`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 5,
        ticks: {
          stepSize: 1,
          callback: (value) => ["", "Very Sad", "Sad", "Neutral", "Happy", "Very Happy"][value] || "",
        },
        title: { display: true, text: "Mood Impact" },
      },
      x: { title: { display: true, text: "Activities" } },
    },
  };

  const activityCompletionChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: {
        display: true,
        text: `Average Completion Rate (${currentMonth.toLocaleString("en-US", { month: "long", year: "numeric" })})`,
        font: { size: 20 },
      },
      tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${context.raw.toFixed(2)}%` } },
    },
    scales: {
      x: { title: { display: true, text: "Day of the Month" } },
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { stepSize: 20, callback: (value) => `${value}%` },
        title: { display: true, text: "Percentage of Activities" },
      },
    },
  };

  const satisfactionChartOptions = {
    responsive: true,
    cutout: "70%",
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || "";
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${percentage}%`;
          },
        },
      },
    },
  };

  return (
    <div>
      <style>
        {`
          .slot-machine-container {
            display: flex;
            justify-content: center;
            gap: 20px;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 10px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.2);
          }
          .slot-reel {
            width: 200px;
            height: 300px;
            overflow: hidden;
            border: 2px solid #0ea5e6;
            border-radius: 10px;
            position: relative;
            background: #fff;
          }
          .slot-reel-inner {
            display: flex;
            flex-direction: column;
            transition: transform 0.5s ease-out;
          }
          .slot-item {
            width: 100%;
            height: 300px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 10px;
            box-sizing: border-box;
            border-bottom: 1px solid #eee;
          }
          .slot-item img {
            width: 100%;
            height: 150px;
            object-fit: cover;
            border-radius: 5px;
          }
          .slot-item h4 {
            font-size: 14px;
            margin: 10px 0;
            text-align: center;
          }
          .slot-item p {
            font-size: 12px;
            color: #666;
            text-align: center;
            margin: 0;
          }
          .spinning .slot-reel-inner {
            animation: spin 0.2s linear infinite;
          }
          @keyframes spin {
            0% { transform: translateY(0); }
            100% { transform: translateY(-300px); }
          }
          .stopped .slot-reel-inner {
            transform: translateY(-${300 * 9}px); /* Adjust to show the last (10th) item */
          }
        `}
      </style>

      <div
        className="site-breadcrumb"
        style={{
          background: "url(assets/img/breadcrumb/01.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          padding: "60px 0",
          textAlign: "center",
          color: "#fff",
        }}
      >
        <div className="container">
          <h2 className="breadcrumb-title">Activities</h2>
          <ul
            className="breadcrumb-menu"
            style={{
              display: "flex",
              justifyContent: "center",
              listStyle: "none",
              padding: "0",
              marginTop: "10px",
            }}
          >
            <li style={{ marginRight: "10px" }}>
              <a href="/Home" style={{ color: "#fff", textDecoration: "none"}}>
                Home
              </a>
            </li>
            <li style={{ color: "#ff5a5f", textDecoration: "none" }}>Activities</li>
          </ul>
        </div>
      </div>

      <div style={{ padding: "40px", backgroundColor: "#f9f9f9", textAlign: "center" }}>
        <h2 style={{ fontSize: "32px", fontWeight: "700", marginBottom: "20px" }}>
          {userRole === "student" ? (
            <>
              Choose your <span style={{ color: "#ff5a5f" }}>favorite activities</span> & add them to your{" "}
              <span style={{ color: "#ff5a5f" }}>daily routine.</span>
            </>
          ) : (
            <>
              Manage <span style={{ color: "#0ea5e6" }}>Activities</span>
            </>
          )}
        </h2>

        <ul
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "15px",
            listStyle: "none",
            marginBottom: "40px",
            flexWrap: "wrap",
            padding: "0",
          }}
        >
          {categories.map((category) => (
            <li className="theme-btn"
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              style={{
                padding: "10px 20px",
                cursor: "pointer",
                background: selectedCategory === category.value ? "#0ea5e6" : "#f1f1f1",
                color: selectedCategory === category.value ? "#fff" : "#333",
                borderRadius: "20px",
                transition: "all 0.3s ease",
                border: "2px solid transparent",
                boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
              }}
            >
              {category.label}
            </li>
          ))}
        </ul>

        <div
          style={{
            marginBottom: "30px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ position: "relative", maxWidth: "500px", flex: "1", minWidth: "250px" }}>
            <input
              type="text"
              placeholder="Search activities by title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 40px 10px 15px",
                borderRadius: "20px",
                border: "1px solid #ddd",
                fontSize: "16px",
                outline: "none",
                boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
              }}
            />
            {searchTerm && (
              <button
                onClick={handleClearSearch}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#666",
                  fontSize: "16px",
                }}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: "15px", flexWrap: "wrap", justifyContent: "center" }}>
            {userRole === "student" && (
              <button className="theme-btn"
                onClick={handleOpenStatsModal}
                style={{
                  backgroundColor: "#0ea5e6",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "50px",
                  border: "none",
                  cursor: "pointer",
                  transition: "background-color 0.3s ease",
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = "#164da6")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "#0ea5e6")}
              >
                Statistics
              </button>
            )}
            {userRole === "student" && (
              <button className="theme-btn"
                onClick={navigateToActivitySchedule}
                style={{
                  backgroundColor: "#0ea5e6",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "50px",
                  border: "none",
                  cursor: "pointer",
                  transition: "background-color 0.3s ease",
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = "#0d8bc2")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "#0ea5e6")}
              >
                Activity Schedule
              </button>
            )}
            {userRole === "student" && (
              <button className="theme-btn"
                onClick={handleProposeActivities}
                style={{
                  backgroundColor: "#ff9500",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "50px",
                  border: "none",
                  cursor: "pointer",
                  transition: "background-color 0.3s ease",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = "#e68600")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "#ff9500")}
              >
                <FontAwesomeIcon icon={faRandom} />
                Propose Activities
              </button>
            )}
            {userRole === "student" && (
              <button className="theme-btn"
                onClick={handleOpenForumRulesModal}
                style={{
                  backgroundColor: "#6b7280",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "50px",
                  border: "none",
                  cursor: "pointer",
                  transition: "background-color 0.3s ease",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = "#4b5563")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "#6b7280")}
              >
                <FontAwesomeIcon icon={faQuestionCircle} />
              </button>
            )}
            {userRole === "psychiatrist" && (
              <button className="theme-btn"
                onClick={handleAddActivity}
                style={{
                  backgroundColor: "#0ea5e6",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "50px",
                  border: "none",
                  cursor: "pointer",
                  transition: "background-color 0.3s ease",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = "#164da6")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "#0ea5e6")}
              >
                <FontAwesomeIcon icon={faPlus} />
                Add Activity
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "30px" }}>
          {currentActivities.length > 0 ? (
            currentActivities.map((activity, index) => (
              <div
                key={index}
                style={{
                  background: "#fff",
                  borderRadius: "15px",
                  overflow: "hidden",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                  transition: "transform 0.3s ease",
                  textAlign: "left",
                  position: "relative",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-10px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
              >
                <img
                  src={
                    activity.imageUrl
                      ? `http://localhost:5000${activity.imageUrl}`
                      : "/assets/img/activities/default.png"
                  }
                  alt="Activity"
                  style={{ width: "100%", height: "250px", objectFit: "cover" }}
                  onClick={() => handleViewActivityModal(activity)}
                />
                <div style={{ padding: "20px" }}>
                  <h4>{stripHtmlTags(activity.title)}</h4>
                  <p style={{ color: "#00aaff", fontStyle: "italic", margin: 0 }}>
                    ** {activity.category?.name || "Uncategorized"} **
                  </p>
                  <p>{stripHtmlTags(activity.description)}</p>
                </div>
                {userRole === "psychiatrist" ? (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px" }}>
                    <button className="theme-btn"
                      onClick={() => handleDelete(activity._id)}
                      style={{
                        backgroundColor: "#f44336",
                        color: "white",
                        padding: "10px 16px",
                        borderRadius: "50px",
                        marginTop: "20px",
                      }}
                      onMouseEnter={(e) => (e.target.style.backgroundColor = "#d32f2f")}
                      onMouseLeave={(e) => (e.target.style.backgroundColor = "#f44336")}
                    >
                      Delete
                    </button>
                    <button className="theme-btn"
                      onClick={() => handleEdit(activity)}
                      style={{
                        backgroundColor: "#0ea5e6",
                        color: "white",
                        padding: "10px 16px",
                        borderRadius: "50px",
                        marginTop: "20px",
                        border: "none",
                        cursor: "pointer",
                        transition: "background-color 0.3s ease",
                      }}
                      onMouseEnter={(e) => (e.target.style.backgroundColor = "#164da6")}
                      onMouseLeave={(e) => (e.target.style.backgroundColor = "#0ea5e6")}
                    >
                      Edit
                    </button>
                  </div>
                ) : userRole === "student" ? (
                  <div
                    style={{
                      padding: "10px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <button className="theme-btn"
                      onClick={() => togglePinActivity(activity._id)}
                      style={{
                        backgroundColor: pinnedActivities.includes(activity._id) ? "#f4b400" : "#ff9500",
                        color: "white",
                        padding: "8px 16px",
                        borderRadius: "50px",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        transition: "background-color 0.3s ease",
                      }}
                      onMouseEnter={(e) =>
                        (e.target.style.backgroundColor = pinnedActivities.includes(activity._id) ? "#d9a300" : "#e68600")
                      }
                      onMouseLeave={(e) =>
                        (e.target.style.backgroundColor = pinnedActivities.includes(activity._id) ? "#f4b400" : "#ff9500")
                      }
                    >
                      <FontAwesomeIcon icon={faThumbtack} />
                      {pinnedActivities.includes(activity._id) ? "Unpin" : "Pin"}
                    </button>
                    <button 
                      onClick={() => toggleFavoriteActivity(activity._id)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "24px",
                        color: favoriteActivities.includes(activity._id) ? "#ff0000" : "#ccc",
                      }}
                    >
                      <FontAwesomeIcon
                        icon={favoriteActivities.includes(activity._id) ? faHeartSolid : faHeartRegular}
                      />
                    </button>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div style={{ textAlign: "center", gridColumn: "span 3" }}>
              <p>No activities available for this category or search.</p>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginTop: "40px",
              gap: "10px",
            }}
          >
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              style={{
                backgroundColor: currentPage === 1 ? "#ccc" : "#0ea5e6",
                color: "white",
                padding: "8px 16px",
                borderRadius: "50px",
                border: "none",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                transition: "background-color 0.3s ease",
              }}
              onMouseEnter={(e) => currentPage !== 1 && (e.target.style.backgroundColor = "#0d8bc2")}
              onMouseLeave={(e) => currentPage !== 1 && (e.target.style.backgroundColor = "#0ea5e6")}
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            {[...Array(totalPages)].map((_, index) => {
              const pageNumber = index + 1;
              return (
                <button
                  key={pageNumber}
                  onClick={() => handlePageChange(pageNumber)}
                  style={{
                    backgroundColor: currentPage === pageNumber ? "#0ea5e6" : "#f1f1f1",
                    color: currentPage === pageNumber ? "white" : "#333",
                    padding: "8px 16px",
                    borderRadius: "50px",
                    border: "none",
                    cursor: "pointer",
                    transition: "background-color 0.3s ease",
                  }}
                  onMouseEnter={(e) => currentPage !== pageNumber && (e.target.style.backgroundColor = "#ddd")}
                  onMouseLeave={(e) => currentPage !== pageNumber && (e.target.style.backgroundColor = "#f1f1f1")}
                >
                  {pageNumber}
                </button>
              );
            })}
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              style={{
                backgroundColor: currentPage === totalPages ? "#ccc" : "#0ea5e6",
                color: "white",
                padding: "8px 16px",
                borderRadius: "50px",
                border: "none",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                transition: "background-color 0.3s ease",
              }}
              onMouseEnter={(e) => currentPage !== totalPages && (e.target.style.backgroundColor = "#0d8bc2")}
              onMouseLeave={(e) => currentPage !== totalPages && (e.target.style.backgroundColor = "#0ea5e6")}
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>
        )}

        {showDeleteModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                padding: "20px",
                borderRadius: "8px",
                width: "400px",
                maxWidth: "90%",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              }}
            >
              <h3 style={{ marginBottom: "20px", textAlign: "center" }}>Confirm Deletion</h3>
              <p style={{ textAlign: "center" }}>Are you sure you want to delete this activity?</p>
              <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                <button className="theme-btn"
                  onClick={() => handleConfirmDelete(activityToDelete)}
                  style={{
                    backgroundColor: "#f44336",
                    color: "white",
                    padding: "10px 20px",
                    borderRadius: "50px",
                    marginTop: "20px",
                  }}
                >
                  Yes, Delete
                </button>
                <button className="theme-btn"
                  onClick={closeDeleteModal}
                  style={{
                    backgroundColor: "#0ea5e6",
                    color: "white",
                    padding: "10px 20px",
                    borderRadius: "50px",
                    marginTop: "20px",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {showModal && selectedActivity && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                padding: "8px",
                borderRadius: "8px",
                width: "550px",
                maxWidth: "90%",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                textAlign: "center",
              }}
            >
              <h3 style={{ fontSize: "20px", marginBottom: "10px" }}>{stripHtmlTags(selectedActivity.title)}</h3>
              <img
                src={
                  selectedActivity.imageUrl
                    ? `http://localhost:5000${selectedActivity.imageUrl}`
                    : "/assets/img/activities/default.png"
                }
                alt="Activity"
                style={{ width: "100%", height: "300px", objectFit: "cover", borderRadius: "8px", marginBottom: "15px" }}
              />
              <p style={{ color: "#00aaff", fontStyle: "italic", marginBottom: "10px" }}>
                ** {selectedActivity.category?.name || "Uncategorized"} **
              </p>
              <p
                style={{
                  fontSize: "14px",
                  marginBottom: "15px",
                  maxHeight: "100px",
                  overflowY: "auto",
                  padding: "0 5px",
                }}
              >
                {stripHtmlTags(selectedActivity.description)}
              </p>
              <button className="theme-btn"
                onClick={closeViewActivityModal}
                style={{
                  backgroundColor: "#0ea5e6",
                  color: "white",
                  padding: "8px 16px",
                  borderRadius: "50px",
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {showStatsModal && (
          <div
            style={{
              position: "fixed",
              top: 20,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                padding: "20px",
                borderRadius: "8px",
                width: "90%",
                maxWidth: "1000px",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              }}
            >
              <h3 style={{ fontSize: "24px", marginBottom: "20px", textAlign: "center" }}>Activity Statistics</h3>

              <div style={{ marginBottom: "40px" }}>
                <h4 style={{ fontSize: "20px", marginBottom: "10px" }}>Impact on Psychological State</h4>
                {moods.length === 0 ? <p>No mood data available.</p> : <Bar data={moodChartData} options={moodChartOptions} />}
              </div>

              <div style={{ marginBottom: "40px" }}>
                <h4 style={{ fontSize: "20px", marginBottom: "10px" }}>Activity Completion Trends</h4>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "20px",
                  }}
                >
                  <button className="theme-btn"
                    onClick={handlePreviousMonth}
                    style={{
                      backgroundColor: "#0ea5e6",
                      color: "white",
                      padding: "8px 16px",
                      borderRadius: "50px",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Previous
                  </button>
                  <span>{currentMonth.toLocaleString("en-US", { month: "long", year: "numeric" })}</span>
                  <button className="theme-btn"
                    onClick={handleNextMonth}
                    style={{
                      backgroundColor: "#0ea5e6",
                      color: "white",
                      padding: "8px 16px",
                      borderRadius: "50px",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Next
                  </button>
                </div>
                {activityCompletionChartData.hasData ? (
                  <Line data={activityCompletionChartData} options={activityCompletionChartOptions} />
                ) : (
                  <p style={{ textAlign: "center", color: "#666" }}>
                    No completion data available for this month. Schedule and complete activities to see trends!
                  </p>
                )}
              </div>

              <div>
                <h4 style={{ fontSize: "20px", marginBottom: "10px" }}>Satisfaction After Activities</h4>
                <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginBottom: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span
                      style={{
                        display: "inline-block",
                        width: "20px",
                        height: "20px",
                        backgroundColor: satisfactionColors.Satisfied,
                        marginRight: "8px",
                        borderRadius: "3px",
                      }}
                    ></span>
                    <span>Satisfied</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span
                      style={{
                        display: "inline-block",
                        width: "20px",
                        height: "20px",
                        backgroundColor: satisfactionColors.NotSatisfied,
                        marginRight: "8px",
                        borderRadius: "3px",
                      }}
                    ></span>
                    <span>Not Satisfied</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span
                      style={{
                        display: "inline-block",
                        width: "20px",
                        height: "20px",
                        backgroundColor: satisfactionColors.NeutralOrUnspecified,
                        marginRight: "8px",
                        borderRadius: "3px",
                      }}
                    ></span>
                    <span>Neutral</span>
                  </div>
                </div>
                {moods.length === 0 ? (
                  <p>No satisfaction data available.</p>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "20px" }}>
                    {Object.keys(satisfactionData)
                      .filter((activityId) => satisfactionData[activityId].totalMoods > 0)
                      .map((activityId) => (
                        <div key={activityId} style={{ width: "200px", textAlign: "center" }}>
                          <h5 style={{ fontSize: "16px", marginBottom: "10px" }}>
                            {satisfactionData[activityId].title}
                          </h5>
                          <Doughnut
                            data={prepareSatisfactionChartData(satisfactionData[activityId])}
                            options={satisfactionChartOptions}
                          />
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <button className="theme-btn"
                onClick={closeStatsModal}
                style={{
                  backgroundColor: "#0ea5e6",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "50px",
                  marginTop: "20px",
                  display: "block",
                  margin: "20px auto 0",
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {showSlotMachineModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                padding: "20px",
                borderRadius: "8px",
                width: "90%",
                maxWidth: "1000px",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                textAlign: "center",
              }}
            >
              <h3 style={{ fontSize: "24px", marginBottom: "20px" }}>Your Proposed Activities</h3>
              <div className="slot-machine-container">
                {[...Array(4)].map((_, index) => {
                  const reelActivities =
                    isSpinning || !proposedActivities[index]
                      ? activities.filter((activity) => !activity.isArchived).sort(() => Math.random() - 0.5).slice(0, 10)
                      : generateReelActivities(proposedActivities[index], index);
                  return (
                    <div key={index} className="slot-reel">
                      <div className={`slot-reel-inner ${isSpinning ? "spinning" : "stopped"}`}>
                        {reelActivities.map((activity, itemIndex) => (
                          <div key={itemIndex} className="slot-item">
                            <img
                              src={
                                activity.imageUrl
                                  ? `http://localhost:5000${activity.imageUrl}`
                                  : "/assets/img/activities/default.png"
                              }
                              alt="Activity"
                            />
                            <h4>{stripHtmlTags(activity.title)}</h4>
                            <p>{stripHtmlTags(activity.description).substring(0, 50)}...</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: "20px" }}>
                <button className="theme-btn"
                  onClick={handleProposeActivities}
                  disabled={isSpinning}
                  style={{
                    backgroundColor: isSpinning ? "#ccc" : "#ff9500",
                    color: "white",
                    padding: "10px 20px",
                    borderRadius: "50px",
                    border: "none",
                    cursor: isSpinning ? "not-allowed" : "pointer",
                    marginRight: "10px",
                  }}
                >
                  Spin Again
                </button>
                <button className="theme-btn"
                  onClick={closeSlotMachineModal}
                  style={{
                    backgroundColor: "#0ea5e6",
                    color: "white",
                    padding: "10px 20px",
                    borderRadius: "50px",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {showForumRulesModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                padding: "20px",
                borderRadius: "8px",
                width: "400px",
                maxWidth: "90%",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                textAlign: "center",
              }}
            >
              <h3 style={{ fontSize: "24px", marginBottom: "20px" }}>Rules</h3>
              <p style={{ fontSize: "16px", marginBottom: "20px", textAlign: "left" }}>
                1. <strong>Be Respectful</strong>: Treat all users with kindness and respect. No harassment, discrimination, or
                offensive language.<br />
                2. <strong>Stay On-Topic</strong>: Keep discussions relevant to the forum's purpose and activities.<br />
                3. <strong>No Spam</strong>: Avoid posting repetitive or irrelevant content, including advertisements.<br />
                4. <strong>Protect Privacy</strong>: Do not share personal information about yourself or others.<br />
                5. <strong>Follow Guidelines</strong>: Adhere to all platform-specific rules and report any violations to moderators.
              </p>
              <button className="theme-btn"
                onClick={closeForumRulesModal}
                style={{
                  backgroundColor: "#0ea5e6",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "50px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </div>
  );
}

export default Activities;