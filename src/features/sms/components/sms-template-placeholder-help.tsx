export function SmsTemplatePlaceholderHelp({
  className = "",
}: {
  className?: string;
}) {
  return (
    <details className={`text-xs leading-5 text-[#657386] ${className}`}>
      <summary className="cursor-pointer font-semibold text-[#526174]">
        Template placeholders
      </summary>
      <p className="mt-1">
        For automatic payment messages: {"{{borrowerName}}"}, {"{{amount}}"},{" "}
        {"{{remainingBalance}}"}, {"{{paymentDate}}"}, {"{{companyName}}"}
      </p>
    </details>
  );
}
