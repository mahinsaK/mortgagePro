"use client";

import { useRouter } from "next/navigation";

type BorrowerRow = {
  id: string;
  name: string;
  businessName: string;
  contactInfo: string;
  loanCount: number;
  activeLoanCount: number;
  status: string;
  createdAt: string;
};

export function BorrowersTable({ borrowers }: { borrowers: BorrowerRow[] }) {
  const router = useRouter();

  function openBorrowerProfile(borrowerId: string) {
    router.push(`/borrowers/${borrowerId}`);
  }

  return (
    <table className="w-full min-w-[820px] border-collapse text-left text-sm">
      <thead className="bg-[#f8fafc] text-[#657386]">
        <tr>
          <th className="px-5 py-3 font-semibold">Name</th>
          <th className="px-5 py-3 font-semibold">Business</th>
          <th className="px-5 py-3 font-semibold">Contact</th>
          <th className="px-5 py-3 font-semibold">Loans</th>
          <th className="px-5 py-3 font-semibold">Active</th>
          <th className="px-5 py-3 font-semibold">Status</th>
          <th className="px-5 py-3 font-semibold">Created</th>
        </tr>
      </thead>
      <tbody>
        {borrowers.map((borrower) => (
          <tr
            className="cursor-pointer border-t border-[#eef2f6] transition hover:bg-[#f8fafc] focus:bg-[#f8fafc] focus:outline-none"
            key={borrower.id}
            onClick={() => openBorrowerProfile(borrower.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openBorrowerProfile(borrower.id);
              }
            }}
            role="link"
            tabIndex={0}
          >
            <td className="px-5 py-4 font-medium text-[#1d4ed8]">
              {borrower.name}
            </td>
            <td className="px-5 py-4 text-[#657386]">
              {borrower.businessName}
            </td>
            <td className="px-5 py-4 text-[#657386]">
              {borrower.contactInfo}
            </td>
            <td className="px-5 py-4">{borrower.loanCount}</td>
            <td className="px-5 py-4">{borrower.activeLoanCount}</td>
            <td className="px-5 py-4">
              <span className="rounded-full bg-[#e0ecff] px-3 py-1 text-xs font-semibold text-[#1d4ed8]">
                {borrower.status}
              </span>
            </td>
            <td className="px-5 py-4 text-[#657386]">{borrower.createdAt}</td>
          </tr>
        ))}
        {borrowers.length === 0 ? (
          <tr className="border-t border-[#eef2f6]">
            <td className="px-5 py-6 text-[#657386]" colSpan={7}>
              No borrowers found.
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}
