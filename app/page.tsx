"use client";

import Link from "next/link";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  owner: User;
};

export default function Home() {
  const router = useRouter();
  useEffect(() => {
  const token = localStorage.getItem("token");

  if (!token) {
    router.push("/login");
  }
}, [router]);
  const [users, setUsers] = useState<User[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);

  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [ownerId, setOwnerId] = useState("");

  const fetchUsers = async () => {
    const response = await fetch("http://localhost:5000/users");
    const data = await response.json();
    setUsers(data);

    // Automatically select first user
    if (data.length > 0 && !ownerId) {
      setOwnerId(data[0].id);
    }
  };

  const fetchTrips = async () => {
    const response = await fetch("http://localhost:5000/trips");
    const data = await response.json();
    setTrips(data);
  };

  useEffect(() => {
    fetchUsers();
    fetchTrips();
  }, []);

  const createTrip = async () => {
    if (!title || !destination || !startDate || !endDate || !budget || !ownerId) {
      alert("Please fill all fields");
      return;
    }

    await fetch("http://localhost:5000/trips", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        destination,
        startDate,
        endDate,
        budget: Number(budget),
        ownerId,
      }),
    });

    setTitle("");
    setDestination("");
    setStartDate("");
    setEndDate("");
    setBudget("");

    fetchTrips();
  };

 

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-4xl font-bold">
          AI Collaborative Trip Planner
        </h1>
        <button
  onClick={() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  }}
  className="rounded-xl bg-red-500 px-4 py-2 text-white"
>
  Logout
</button>

        <p className="mb-8 text-gray-600">
          Create and manage group trips.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Create Trip Form */}
          <section className="rounded-xl bg-white p-6 shadow">
            <h2 className="mb-4 text-2xl font-semibold">
              Create New Trip
            </h2>

            <div className="flex flex-col gap-4">
              <input
                className="rounded border p-3"
                placeholder="Trip Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <input
                className="rounded border p-3"
                placeholder="Destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />

              <input
                className="rounded border p-3"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />

              <input
                className="rounded border p-3"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />

              <input
                className="rounded border p-3"
                type="number"
                placeholder="Budget"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />

              <select
                className="rounded border p-3"
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
              >
                <option value="">Select Owner</option>

                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>

              <button
                onClick={createTrip}
                className="rounded bg-black p-3 text-white"
              >
                Create Trip
              </button>
            </div>
          </section>

          {/* Trip List */}
          <section className="rounded-xl bg-white p-6 shadow">
            <h2 className="mb-4 text-2xl font-semibold">
              Saved Trips
            </h2>

            {trips.length === 0 ? (
              <p className="text-gray-500">
                No trips created yet.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {trips.map((trip) => (
                  <Link
                    href={`/trips/${trip.id}`}
                    key={trip.id}
                    className="block rounded-lg border p-4 hover:bg-gray-50"
                  >
                    <h3 className="text-xl font-bold">
                      {trip.title}
                    </h3>

                    <p className="text-gray-700">
                      Destination: {trip.destination}
                    </p>

                    <p className="text-gray-700">
                      Budget: ₹{trip.budget}
                    </p>

                    <p className="text-gray-700">
                      Owner: {trip.owner?.name}
                    </p>

                    <p className="text-sm text-gray-500">
                      {new Date(trip.startDate).toLocaleDateString()} - {" "}
                      {new Date(trip.endDate).toLocaleDateString()}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}