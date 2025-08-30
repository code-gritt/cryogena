import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  LogOut,
  Trash2,
  Download,
  Briefcase,
  MoreVertical,
  FolderPlus,
  Upload,
  Folder,
  Image,
  FileText,
  Music,
  Video,
} from "lucide-react";
import useUserStore from "../../store/userStore";
import toast from "react-hot-toast";

const Workspace = () => {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [dropdownFileId, setDropdownFileId] = useState(null);
  const [renameFileId, setRenameFileId] = useState(null);
  const [newFileName, setNewFileName] = useState("");
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({
    x: 0,
    y: 0,
  });
  const { user, token, clearUser } = useUserStore();
  const navigate = useNavigate();
  const { folderId } = useParams();
  const mainRef = useRef(null);
  const fileInputRef = useRef(null);

  const endpoint = "https://cryogena-backend.onrender.com/graphql/";
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // Fetch workspace data
  const fetchWorkspaceData = async () => {
    setLoading(true);
    setError("");

    try {
      if (folderId) {
        // Fetch folder-specific contents
        const response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            query: `
              query ($folderId: ID!) {
                folderContents(folderId: $folderId) {
                  files {
                    id
                    name
                    ownerAvatar
                    createdAt
                    size
                    fileType
                    fileUrl
                  }
                  folders {
                    id
                    name
                    createdAt
                  }
                }
              }
            `,
            variables: { folderId },
          }),
        });
        const { data, errors } = await response.json();
        if (errors) throw new Error(errors[0].message);
        setFiles(data.folderContents.files);
        setFolders(data.folderContents.folders);
      } else {
        // Fetch root-level files and folders
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
                  fileType
                  fileUrl
                }
              }
            `,
          }),
        });
        const { data: filesData, errors: filesErrors } =
          await filesResponse.json();
        if (filesErrors) throw new Error(filesErrors[0].message);
        setFiles(filesData.userFiles);

        const foldersResponse = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            query: `
              query {
                userFolders {
                  id
                  name
                  createdAt
                }
              }
            `,
          }),
        });
        const { data: foldersData, errors: foldersErrors } =
          await foldersResponse.json();
        if (foldersErrors) throw new Error(foldersErrors[0].message);
        setFolders(foldersData.userFolders);
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !token) {
      navigate("/login");
      return;
    }
    fetchWorkspaceData();
  }, [user, token, navigate, folderId]);

  // Handle double-click on folder
  const handleFolderDoubleClick = (folderId) => {
    navigate(`/workspace/${folderId}`);
  };

  // Handle right-click context menu
  const handleContextMenu = (e) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setIsContextMenuOpen(true);
  };

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      setIsContextMenuOpen(false);
      setDropdownFileId(null);
      setRenameFileId(null);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Logout
  const handleLogout = () => {
    clearUser();
    navigate("/login");
    toast.success("Logged out successfully");
  };

  // Create Folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error("Folder name cannot be empty");
      return;
    }
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: `
            mutation ($name: String!, $parentId: ID) {
              createFolder(name: $name, parentId: $parentId) {
                folder {
                  id
                  name
                  createdAt
                }
              }
            }
          `,
          variables: { name: newFolderName, parentId: folderId || null },
        }),
      });
      const { data, errors } = await response.json();
      if (errors) throw new Error(errors[0].message);

      setFolders([data.createFolder.folder, ...folders]);
      setNewFolderName("");
      setIsModalOpen(false);
      setIsContextMenuOpen(false);
      toast.success("Folder created successfully");
      return data.createFolder.folder.id; // Return folder ID for upload
    } catch (err) {
      toast.error(err.message);
      return null;
    }
  };

  // Upload Files
  const handleUpload = async (files, uploadFolderId = null) => {
    if (!files.length) {
      toast.error("Please select files to upload.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      const operations = {
        query: `
          mutation ($files: [Upload!]!, $folderId: ID) {
            uploadFile(files: $files, folderId: $folderId) {
              success
              message
            }
          }
        `,
        variables: {
          files: new Array(files.length).fill(null),
          folderId: uploadFolderId || selectedFolderId || folderId,
        },
      };
      formData.append("operations", JSON.stringify(operations));
      const map = {};
      Array.from(files).forEach((_, i) => {
        map[i] = [`variables.files.${i}`];
      });
      formData.append("map", JSON.stringify(map));
      Array.from(files).forEach((file, i) => formData.append(`${i}`, file));

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const { data, errors } = await response.json();
      if (errors) throw new Error(errors[0].message);
      if (data.uploadFile.success) {
        await fetchWorkspaceData();
        setSelectedFiles([]);
        setSelectedFolderId(null);
        setIsModalOpen(false);
        toast.success(data.uploadFile.message);
      }
    } catch (err) {
      toast.error(err.message || "Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  // Right-Click Upload to New Folder
  const handleUploadToNewFolder = async () => {
    setIsContextMenuOpen(false);
    setIsModalOpen(true);
    setNewFolderName("New Folder");
  };

  // Handle modal submission (folder creation or file upload)
  const handleModalSubmit = async () => {
    if (newFolderName.trim()) {
      const newFolderId = await handleCreateFolder();
      if (newFolderId && selectedFiles.length) {
        await handleUpload(selectedFiles, newFolderId);
      }
    } else if (selectedFiles.length) {
      await handleUpload(selectedFiles);
    } else {
      toast.error("Please select files or enter a folder name.");
    }
  };

  // Rename File
  const handleRename = async (fileId, newName) => {
    setLoading(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: `
            mutation ($fileId: ID!, $newName: String!) {
              renameFile(fileId: $fileId, newName: $newName) {
                success
                message
              }
            }
          `,
          variables: { fileId, newName },
        }),
      });
      const { data, errors } = await response.json();
      if (errors) throw new Error(errors[0].message);
      if (data.renameFile.success) {
        setFiles(
          files.map((f) => (f.id === fileId ? { ...f, name: newName } : f))
        );
        setRenameFileId(null);
        setNewFileName("");
        setDropdownFileId(null);
        toast.success("File renamed successfully");
      }
    } catch (err) {
      toast.error(err.message || "Rename failed.");
    } finally {
      setLoading(false);
    }
  };

  // Delete File
  const handleDelete = async (fileId) => {
    setLoading(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: `
            mutation ($fileId: ID!) {
              deleteFile(fileId: $fileId) {
                success
                message
              }
            }
          `,
          variables: { fileId },
        }),
      });
      const { data, errors } = await response.json();
      if (errors) throw new Error(errors[0].message);
      if (data.deleteFile.success) {
        setFiles(files.filter((f) => f.id !== fileId));
        setDropdownFileId(null);
        toast.success("File moved to bin");
      }
    } catch (err) {
      toast.error(err.message || "Delete failed.");
    } finally {
      setLoading(false);
    }
  };

  // Loading UI
  if (loading) {
    return (
      <div className="fixed inset-0 bg-opacity-10 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-orange-500"></div>
      </div>
    );
  }

  // Error UI
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
          href="/dashboard"
          className="flex items-center text-white hover:text-orange-500"
        >
          <Briefcase size={20} className="mr-2" /> Dashboard
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
      </aside>

      {/* Main Section */}
      <main
        className="flex-1 p-4 md:p-8"
        ref={mainRef}
        onContextMenu={handleContextMenu}
      >
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            {folderId ? `Folder Contents` : "Workspace"}
          </h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="py-2 px-4 bg-gradient-to-r from-orange-500 to-orange-800 text-white rounded-md hover:from-orange-600 hover:to-orange-900"
          >
            <Upload size={16} className="inline mr-2" /> Upload
          </button>
        </div>

        {/* File and Folder Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className="relative bg-neutral-800 p-4 rounded-lg text-center cursor-pointer"
              onDoubleClick={() => handleFolderDoubleClick(folder.id)}
            >
              <Folder size={40} className="text-orange-500 mx-auto mb-2" />
              <p className="text-white text-sm truncate">{folder.name}</p>
            </div>
          ))}
          {files.map((file) => (
            <div
              key={file.id}
              className="relative bg-neutral-800 p-4 rounded-lg text-center"
            >
              {file.fileType === "image" && (
                <Image size={40} className="text-orange-500 mx-auto mb-2" />
              )}
              {file.fileType === "pdf" && (
                <FileText size={40} className="text-orange-500 mx-auto mb-2" />
              )}
              {file.fileType === "doc" && (
                <FileText size={40} className="text-orange-500 mx-auto mb-2" />
              )}
              {file.fileType === "mp3" && (
                <Music size={40} className="text-orange-500 mx-auto mb-2" />
              )}
              {file.fileType === "video" && (
                <Video size={40} className="text-orange-500 mx-auto mb-2" />
              )}
              <p className="text-white text-sm truncate">{file.name}</p>
              <button
                onClick={() => setDropdownFileId(file.id)}
                className="absolute top-2 right-2 text-neutral-400 hover:text-orange-500"
              >
                <MoreVertical size={20} />
              </button>
              {dropdownFileId === file.id && (
                <div className="absolute top-8 right-2 bg-neutral-700 rounded-md shadow-lg z-10">
                  <button
                    onClick={() => window.open(file.fileUrl, "_blank")}
                    className="block w-full text-left px-4 py-2 text-white hover:bg-neutral-600"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => {
                      setRenameFileId(file.id);
                      setNewFileName(file.name);
                      setDropdownFileId(null);
                    }}
                    className="block w-full text-left px-4 py-2 text-white hover:bg-neutral-600"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => handleDelete(file.id)}
                    className="block w-full text-left px-4 py-2 text-white hover:bg-neutral-600"
                  >
                    Delete
                  </button>
                </div>
              )}
              {renameFileId === file.id && (
                <div className="absolute inset-0 bg-neutral-800 p-4 rounded-lg flex flex-col space-y-2">
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    className="w-full p-2 rounded-md bg-neutral-700 text-white border border-neutral-600 focus:outline-none focus:border-orange-500"
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setRenameFileId(null)}
                      className="py-1 px-2 bg-neutral-600 text-white rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleRename(file.id, newFileName)}
                      className="py-1 px-2 bg-gradient-to-r from-orange-500 to-orange-800 text-white rounded-md"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Context Menu */}
        {isContextMenuOpen && (
          <div
            className="absolute bg-neutral-700 rounded-md shadow-lg z-50"
            style={{ top: contextMenuPosition.y, left: contextMenuPosition.x }}
          >
            <button
              onClick={() => {
                setIsModalOpen(true);
                setNewFolderName("New Folder");
                setIsContextMenuOpen(false);
              }}
              className="block w-full text-left px-4 py-2 text-white hover:bg-neutral-600"
            >
              New Folder
            </button>
            <button
              onClick={handleUploadToNewFolder}
              className="block w-full text-left px-4 py-2 text-white hover:bg-neutral-600"
            >
              Upload to New Folder
            </button>
          </div>
        )}
      </main>

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-neutral-800 p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">
              Upload Files or Create Folder
            </h2>
            <input
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.mp3,.mp4"
              onChange={(e) => setSelectedFiles([...e.target.files])}
              className="w-full p-2 mb-4 bg-neutral-700 text-white rounded-md"
              ref={fileInputRef}
            />
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="New Folder Name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full p-2 rounded-md bg-neutral-700 text-white border border-neutral-600 focus:outline-none focus:border-orange-500"
              />
              <FolderPlus
                size={20}
                className="absolute top-2 right-2 text-neutral-400"
              />
            </div>
            <select
              value={selectedFolderId || ""}
              onChange={(e) => setSelectedFolderId(e.target.value || null)}
              className="w-full p-2 mb-4 rounded-md bg-neutral-700 text-white border border-neutral-600 focus:outline-none focus:border-orange-500"
            >
              <option value="">No Folder</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedFiles([]);
                  setNewFolderName("");
                  setSelectedFolderId(null);
                }}
                className="py-2 px-4 bg-neutral-600 text-white rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleModalSubmit}
                className="py-2 px-4 bg-gradient-to-r from-orange-500 to-orange-800 text-white rounded-md hover:from-orange-600 hover:to-orange-900"
              >
                {newFolderName ? "Create Folder" : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workspace;
