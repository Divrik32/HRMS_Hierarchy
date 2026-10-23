const CompanyDashboard = () => {
  return (
    <div className="space-y-6">

      <h1 className="text-3xl font-bold">
        Company Dashboard
      </h1>

      <div className="grid md:grid-cols-4 gap-5">

        <div className="bg-white p-5 rounded-xl shadow">
          Total Employees
        </div>

        <div className="bg-white p-5 rounded-xl shadow">
          Departments
        </div>

        <div className="bg-white p-5 rounded-xl shadow">
          Roles
        </div>

        <div className="bg-white p-5 rounded-xl shadow">
          Projects
        </div>

      </div>

    </div>
  );
};

export default CompanyDashboard;