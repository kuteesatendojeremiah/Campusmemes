export const RULES = [
  "Laugh at situations, not people.",
  "No real names, no photos of real people, and no school names.",
  "No sexual, hateful or tribal content.",
  "Nothing that targets or bullies a person.",
  "Posts with several reports are hidden until reviewed. Repeat rule breakers are banned by phone number or email.",
];

export default function HouseRules() {
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-sm text-gray-700">
      {RULES.map((r) => (
        <li key={r}>{r}</li>
      ))}
    </ul>
  );
}
