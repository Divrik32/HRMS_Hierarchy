const EmployeeDashboard = () => {
  return (
    <div className="space-y-6">

      <h1 className="text-3xl font-bold">
        Employee Dashboard
      </h1>

      <div className="grid md:grid-cols-4 gap-5">

        <div className="bg-white p-5 rounded-xl shadow">
          Total Projects
        </div>

        <div className="bg-white p-5 rounded-xl shadow">
          Active Tasks
        </div>

        <div className="bg-white p-5 rounded-xl shadow">
          Pending Reviews
        </div>

        <div className="bg-white p-5 rounded-xl shadow">
          Attendance
        </div>

      </div>

    </div>
  );
};

export default EmployeeDashboard;