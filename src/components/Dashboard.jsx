import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  Trash2,
  Edit,
  Download,
  Folder,
  Image,
  FileText,
  Music,
  Video,
  Briefcase,
} from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import useUserStore from "../../store/userStore";

const Dashboard = () => {
  const [stats, setStats] = useState({
    imagesCount: 0,
    pdfsCount: 0,
    docsCount: 0,
    foldersCount: 0,
    mp3sCount: 0,
    videosCount: 0,
    totalStorageUsed: 0,
    storageLimit: 1,
  });
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user, token, clearUser } = useUserStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !token) {
      navigate("/login");
      return;
    }

    const fetchDashboardData = async () => {
      setLoading(true);
      setError("");

      try {
        const endpoint = "https://cryogena-backend.onrender.com/graphql/";
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };

        // Fetch stats
        const statsResponse = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            query: `
              query {
                dashboardStats {
                  imagesCount
                  pdfsCount
                  docsCount
                  foldersCount
                  mp3sCount
                  videosCount
                  totalStorageUsed
                  storageLimit
                }
              }
            `,
          }),
        });

        const { data: statsData, errors: statsErrors } =
          await statsResponse.json();
        if (statsErrors) throw new Error(statsErrors[0].message);
        setStats(statsData.dashboardStats);

        // Fetch files
        const filesResponse = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            query: `
              query {
                userFiles {
                  id
                  name
                  ownerAvatar
                  createdAt
                  size
                }
              }
            `,
          }),
        });

        const { data: filesData, errors: filesErrors } =
          await filesResponse.json();
        if (filesErrors) throw new Error(filesErrors[0].message);
        setFiles(filesData.userFiles);
      } catch (err) {
        setError(err.message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, token, navigate]);

  const handleLogout = () => {
    clearUser();
    navigate("/login");
  };

  const progress = (stats.totalStorageUsed / stats.storageLimit) * 100;
  const isFull = progress >= 100;

  const columns = [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "name", header: "Uploaded File Name" },
    {
      accessorKey: "ownerAvatar",
      header: "Owner",
      cell: ({ row }) => (
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-orange-800 flex items-center justify-center text-white font-bold">
          {row.original.ownerAvatar}
        </div>
      ),
    },
    { accessorKey: "createdAt", header: "Timestamp" },
    { accessorKey: "size", header: "Size (bytes)" },
    {
      header: "Actions",
      cell: () => (
        <div className="flex space-x-2">
          <Edit
            size={20}
            className="text-neutral-400 hover:text-orange-500 cursor-pointer"
          />
          <Trash2
            size={20}
            className="text-neutral-400 hover:text-orange-500 cursor-pointer"
          />
        </div>
      ),
    },
    {
      header: "Download",
      cell: () => (
        <button className="py-1 px-2 bg-gradient-to-r from-orange-500 to-orange-800 text-white rounded-md hover:from-orange-600 hover:to-orange-900">
          <Download size={16} />
        </button>
      ),
    },
  ];

  const table = useReactTable({
    data: files,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Loader Overlay
  if (loading) {
    return (
      <div className="fixed inset-0 bg-opacity-10 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-[#F65003]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-neutral-900">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-neutral-800 p-4 flex flex-col space-y-4">
        <a
          href="/workspace"
          className="flex items-center text-white hover:text-orange-500"
        >
          <Briefcase size={20} className="mr-2" /> Workspace
        </a>
        <button
          onClick={handleLogout}
          className="flex items-center text-white hover:text-orange-500"
        >
          <LogOut size={20} className="mr-2" /> Logout
        </button>
        <a
          href="/bin"
          className="flex items-center text-white hover:text-orange-500"
        >
          <Trash2 size={20} className="mr-2" /> Bin
        </a>

        {/* Storage Indicator */}
        <div className="text-white">
          <p>Storage</p>
          <div className="w-full bg-neutral-700 rounded-full h-2.5 mt-2">
            <div
              className="bg-orange-500 h-2.5 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            {stats.totalStorageUsed} / {stats.storageLimit} bytes used
          </p>
          {isFull && (
            <a
              href="/pricing"
              className="text-orange-500 hover:underline text-sm"
            >
              Upgrade for more storage
            </a>
          )}
        </div>
      </aside>

      {/* Main Section */}
      <main className="flex-1 p-4 md:p-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-6">
          Dashboard
        </h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <StatCard
            icon={<Image size={28} />}
            label="Images"
            value={stats.imagesCount}
          />
          <StatCard
            icon={<FileText size={28} />}
            label="Docs/PDFs"
            value={stats.pdfsCount + stats.docsCount}
          />
          <StatCard
            icon={<Folder size={28} />}
            label="Folders"
            value={stats.foldersCount}
          />
          <StatCard
            icon={<Music size={28} />}
            label="MP3"
            value={stats.mp3sCount}
          />
          <StatCard
            icon={<Video size={28} />}
            label="Videos"
            value={stats.videosCount}
          />
        </div>

        {/* Files Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-white text-sm md:text-base">
            <thead className="bg-neutral-700">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="p-2 md:p-4 text-left">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-neutral-700">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="p-2 md:p-4">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

// Reusable StatCard
const StatCard = ({ icon, label, value }) => (
  <div className="bg-neutral-800 p-3 md:p-4 rounded-lg text-center">
    <div className="text-orange-500 mx-auto mb-1 md:mb-2">{icon}</div>
    <p className="text-white font-bold text-lg">{value}</p>
    <p className="text-neutral-400 text-sm">{label}</p>
  </div>
);

export default Dashboard;
