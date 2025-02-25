import React, { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";

function DetailsStudents() {
    const [user, setUser] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        dob: '',
        speciality: '',
        level: '',
        role: '',
        etat: ''
    });
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
    });
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('jwt-token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                const fetchUser = async () => {
                    try {
                        const response = await fetch(`http://localhost:5000/users/session/${decoded.id}`);
                        const data = await response.json();
                        if (response.ok) {
                            setUser(data);
                            setFormData({
                                username: data.username,
                                email: data.email,
                                dob: data.dob,
                                speciality: data.speciality,
                                level: data.level,
                                role: data.role,
                                etat: data.etat
                            });
                        } else {
                            console.error('Failed to fetch user:', data.message);
                        }
                    } catch (error) {
                        console.error('Error fetching user:', error);
                    }
                };
                fetchUser();
            } catch (error) {
                console.error('Invalid token:', error);
                localStorage.removeItem('jwt-token');
                window.location.href = '/login';
            }
        }
    }, []);

    useEffect(() => {
        if (user) {
            setFormData({
                username: user.username,
                email: user.email,
                dob: user.dob,
                speciality: user.speciality,
                level: user.level,
                role: user.role,
                etat: user.etat
            });
        }
    }, [user]);

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setFormData({
            username: user.username,
            email: user.email,
            dob: user.dob,
            speciality: user.speciality,
            level: user.level,
            role: user.role,
            etat: user.etat
        });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value
        }));
    };

    const handleSave = async () => {
        if (!formData.username) {
            alert("Username cannot be empty");
            return;
        }
        try {
            const token = localStorage.getItem('jwt-token');
            const decoded = jwtDecode(token);
            const response = await fetch(`http://localhost:5000/users/students/update/${decoded.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            if (response.ok) {
                setUser(data.user || data.student); // Mettre à jour l'état `user`
                setIsEditing(false);
            } else {
                console.error('Error updating profile:', data.message);
            }
        } catch (error) {
            console.error('Error updating profile:', error);
        }
    };

    const handleChangePassword = async () => {
        if (passwordData.newPassword !== passwordData.confirmNewPassword) {
            alert("Passwords do not match");
            return;
        }
        if (!passwordData.newPassword || !passwordData.confirmNewPassword || !passwordData.currentPassword) {
            alert("All fields are required");
            return;
        }
        try {
            const token = localStorage.getItem('jwt-token');
            const decoded = jwtDecode(token);
            const response = await fetch(`http://localhost:5000/users/students/update/${decoded.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ password: passwordData.newPassword })
            });

            const data = await response.json();
            if (response.ok) {
                alert("Password changed successfully");
                setIsChangingPassword(false);
                setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmNewPassword: ''
                });
            } else {
                console.error('Error changing password:', data.message);
            }
        } catch (error) {
            console.error('Error changing password:', error);
        }
    };

    const handleDeleteAccount = async () => {
        const confirmDelete = window.confirm("Are you sure you want to delete your account? This action cannot be undone.");
        if (!confirmDelete) return;

        try {
            const token = localStorage.getItem('jwt-token');
            const decoded = jwtDecode(token);
            const response = await fetch(`http://localhost:5000/users/delete/${decoded.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                alert("Account deleted successfully");
                localStorage.removeItem('jwt-token');
                window.location.href = "/login";
            } else {
                const data = await response.json();
                console.error('Error deleting account:', data.message);
            }
        } catch (error) {
            console.error('Error deleting account:', error);
        }
    };

    if (!user) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <main className="main">
                <div className="site-breadcrumb" style={{ background: "url(assets/img/breadcrumb/01.jpg)" }}>
                    <div className="container">
                        <h2 className="breadcrumb-title">Volunteer Single</h2>
                        <ul className="breadcrumb-menu">
                            <li><a href="index.html">Home</a></li>
                            <li className="active">Volunteer Single</li>
                        </ul>
                    </div>
                </div>

                <div className="team-single py-120">
                    <div className="container">
                        <div className="team-single-wrap">
                            <div className="row align-items-center">
                                <div className="col-lg-4">
                                    <div className="team-single-img">
                                        <img src="assets/img/user.png" alt="team member" />
                                    </div>
                                </div>
                                <div className="col-lg-8">
                                    <div className="team-single-content">
                                        <div className="team-single-name">
                                            <h2>{user.username}</h2>
                                            {isEditing ? (
                                                <>
                                                    <input
                                                        type="text"
                                                        name="username"
                                                        value={formData.username}
                                                        onChange={handleChange}
                                                    />
                                                    {formData.username === '' && <span style={{ color: 'red' }}>Username is required</span>}
                                                </>
                                            ) : (
                                                <span></span>
                                            )}
                                            <p>{user.speciality}</p>
                                        </div>
                                        <div className="team-single-info">
                                            <ul style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(3, 1fr)',
                                                gap: '20px',
                                                listStyleType: 'none',
                                                padding: '0',
                                            }}>
                                                <li>
                                                    <div>
                                                        <h6>Email</h6>
                                                        {isEditing ? (
                                                            <input
                                                                type="email"
                                                                name="email"
                                                                value={formData.email}
                                                                onChange={handleChange}
                                                                disabled
                                                            />
                                                        ) : (
                                                            <span>{user.email}</span>
                                                        )}
                                                    </div>
                                                </li>

                                                <li>
                                                    <div>
                                                        <h6>Date of Birth</h6>
                                                        {isEditing ? (
                                                            <input
                                                                type="date"
                                                                name="dob"
                                                                value={formData.dob}
                                                                onChange={handleChange}
                                                            />
                                                        ) : (
                                                            <span>{new Date(user.dob).toLocaleDateString()}</span>
                                                        )}
                                                    </div>
                                                </li>

                                                {user.role === "student" && (
                                                    <>
                                                        <li>
                                                            <div>
                                                                <h6>Speciality</h6>
                                                                {isEditing ? (
                                                                    <select
                                                                        name="speciality"
                                                                        value={formData.speciality}
                                                                        onChange={handleChange}
                                                                    >
                                                                        <option value="A">A</option>
                                                                        <option value="B">B</option>
                                                                        <option value="P">P</option>
                                                                        <option value="TWIN">TWIN</option>
                                                                        <option value="SAE">SAE</option>
                                                                        <option value="SE">SE</option>
                                                                        <option value="BI">BI</option>
                                                                        <option value="DS">DS</option>
                                                                        <option value="IOSYS">IOSYS</option>
                                                                        <option value="SLEAM">SLEAM</option>
                                                                        <option value="SIM">SIM</option>
                                                                        <option value="NIDS">NIDS</option>
                                                                        <option value="INFINI">INFINI</option>
                                                                    </select>
                                                                ) : (
                                                                    <span>{user.speciality}</span>
                                                                )}
                                                            </div>
                                                        </li>

                                                        <li>
                                                            <div>
                                                                <h6>Level</h6>
                                                                {isEditing ? (
                                                                    <select
                                                                        name="level"
                                                                        value={formData.level}
                                                                        onChange={handleChange}
                                                                    >
                                                                        <option value="1">1</option>
                                                                        <option value="2">2</option>
                                                                        <option value="3">3</option>
                                                                        <option value="4">4</option>
                                                                        <option value="5">5</option>
                                                                    </select>
                                                                ) : (
                                                                    <span>{user.level}</span>
                                                                )}
                                                            </div>
                                                        </li>
                                                    </>
                                                )}

                                                <li>
                                                    <div>
                                                        <h6>Role</h6>
                                                        {isEditing ? (
                                                            <input
                                                                type="text"
                                                                name="role"
                                                                value={formData.role}
                                                                onChange={handleChange}
                                                                disabled
                                                            />
                                                        ) : (
                                                            <span>{user.role}</span>
                                                        )}
                                                    </div>
                                                </li>

                                                <li>
                                                    <div>
                                                        <h6>Status</h6>
                                                        {isEditing ? (
                                                            <input
                                                                type="text"
                                                                name="etat"
                                                                value={formData.etat}
                                                                onChange={handleChange}
                                                                disabled
                                                            />
                                                        ) : (
                                                            <span>{user.etat}</span>
                                                        )}
                                                    </div>
                                                </li>
                                            </ul>

                                            <div style={{ textAlign: 'center', marginTop: '20px' }}>
                                                {user.role === "student" && (
                                                    <>
                                                        {isEditing ? (
                                                            <>
                                                                <button
                                                                    onClick={handleSave}
                                                                    style={{
                                                                        backgroundColor: '#4CAF50',
                                                                        color: 'white',
                                                                        padding: '10px 20px',
                                                                        fontSize: '16px',
                                                                        border: 'none',
                                                                        cursor: 'pointer',
                                                                        borderRadius: '5px',
                                                                    }}
                                                                >
                                                                    <i className="far fa-save" style={{ marginRight: '8px' }}></i> Save
                                                                </button>
                                                                <button
                                                                    onClick={handleCancel}
                                                                    style={{
                                                                        backgroundColor: '#f44336',
                                                                        color: 'white',
                                                                        padding: '10px 20px',
                                                                        fontSize: '16px',
                                                                        border: 'none',
                                                                        cursor: 'pointer',
                                                                        borderRadius: '5px',
                                                                        marginLeft: '10px',
                                                                    }}
                                                                >
                                                                    <i className="far fa-times" style={{ marginRight: '8px' }}></i> Cancel
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                onClick={handleEdit}
                                                                style={{
                                                                    backgroundColor: '#4CAF50',
                                                                    color: 'white',
                                                                    padding: '10px 20px',
                                                                    fontSize: '16px',
                                                                    cursor: 'pointer',
                                                                    borderRadius: '5px',
                                                                }}
                                                            >
                                                                <i className="far fa-edit" style={{ marginRight: '8px' }}></i> Edit
                                                            </button>
                                                        )}
                                                    </>
                                                )}

                                                <button
                                                    onClick={() => setIsChangingPassword(true)}
                                                    style={{
                                                        backgroundColor: '#2196F3',
                                                        color: 'white',
                                                        padding: '10px 20px',
                                                        fontSize: '16px',
                                                        cursor: 'pointer',
                                                        borderRadius: '5px',
                                                        marginTop: '10px',
                                                        marginLeft: '10px',
                                                    }}
                                                >
                                                    <i className="fas fa-key" style={{ marginRight: '8px' }}></i> Change Password
                                                </button>

                                                <button
                                                    onClick={handleDeleteAccount}
                                                    style={{
                                                        backgroundColor: '#ff0000',
                                                        color: 'white',
                                                        padding: '10px 20px',
                                                        fontSize: '16px',
                                                        cursor: 'pointer',
                                                        borderRadius: '5px',
                                                        marginTop: '10px',
                                                        marginLeft: '10px',
                                                    }}
                                                >
                                                    <i className="fas fa-trash" style={{ marginRight: '8px' }}></i> Delete Account
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {isChangingPassword && (
                    <div style={{ marginTop: '20px', textAlign: 'center' }}>
                        <h3>Change Password</h3>
                        <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <input
                                type={showCurrentPassword ? "text" : "password"}
                                name="currentPassword"
                                placeholder="Current Password"
                                value={passwordData.currentPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                style={{ padding: '10px', width: '300px' }}
                            />
                            <i
                                className={`fas ${showCurrentPassword ? 'fa-eye-slash' : 'fa-eye'}`}
                                onMouseDown={() => setShowCurrentPassword(true)}
                                onMouseUp={() => setShowCurrentPassword(false)}
                                style={{ marginLeft: '10px', cursor: 'pointer' }}
                            />
                        </div>
                        <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <input
                                type={showNewPassword ? "text" : "password"}
                                name="newPassword"
                                placeholder="New Password"
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                style={{ padding: '10px', width: '300px' }}
                            />
                            <i
                                className={`fas ${showNewPassword ? 'fa-eye-slash' : 'fa-eye'}`}
                                onMouseDown={() => setShowNewPassword(true)}
                                onMouseUp={() => setShowNewPassword(false)}
                                style={{ marginLeft: '10px', cursor: 'pointer' }}
                            />
                        </div>
                        <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <input
                                type={showConfirmNewPassword ? "text" : "password"}
                                name="confirmNewPassword"
                                placeholder="Confirm New Password"
                                value={passwordData.confirmNewPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, confirmNewPassword: e.target.value })}
                                style={{ padding: '10px', width: '300px' }}
                            />
                            <i
                                className={`fas ${showConfirmNewPassword ? 'fa-eye-slash' : 'fa-eye'}`}
                                onMouseDown={() => setShowConfirmNewPassword(true)}
                                onMouseUp={() => setShowConfirmNewPassword(false)}
                                style={{ marginLeft: '10px', cursor: 'pointer' }}
                            />
                        </div>
                        <button
                            onClick={handleChangePassword}
                            style={{
                                backgroundColor: '#4CAF50',
                                color: 'white',
                                padding: '10px 20px',
                                fontSize: '16px',
                                border: 'none',
                                cursor: 'pointer',
                                borderRadius: '5px',
                            }}
                        >
                            Save New Password
                        </button>
                        <button
                            onClick={() => setIsChangingPassword(false)}
                            style={{
                                backgroundColor: '#f44336',
                                color: 'white',
                                padding: '10px 20px',
                                fontSize: '16px',
                                border: 'none',
                                cursor: 'pointer',
                                borderRadius: '5px',
                                marginLeft: '10px',
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}

export default DetailsStudents;