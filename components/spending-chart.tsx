"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { formatCurrency } from "@/lib/utils";

interface CategoryData {
  categoryId: string | number | null;
  categoryName: string | null;
  categoryColor: string | null;
  total: number;
  count?: number;
  isExpense: boolean;
}

interface SpendingChartProps {
  data: CategoryData[];
  width?: number;
  height?: number;
  onCategoryClick?: (categoryId: string | number | null) => void;
}

export function SpendingChart({ data, width = 300, height = 300, onCategoryClick }: SpendingChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return;

    const expenses = data.filter((d) => d.isExpense && d.total > 0);
    if (expenses.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const radius = Math.min(width, height) / 2 - 20;
    const innerRadius = radius * 0.6;

    const g = svg
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const pie = d3
      .pie<CategoryData>()
      .value((d) => d.total)
      .sort(null);

    const arc = d3
      .arc<d3.PieArcDatum<CategoryData>>()
      .innerRadius(innerRadius)
      .outerRadius(radius)
      .cornerRadius(4)
      .padAngle(0.02);

    const hoverArc = d3
      .arc<d3.PieArcDatum<CategoryData>>()
      .innerRadius(innerRadius)
      .outerRadius(radius + 8)
      .cornerRadius(4)
      .padAngle(0.02);

    const arcs = g
      .selectAll("path")
      .data(pie(expenses))
      .enter()
      .append("path")
      .attr("d", arc)
      .attr("fill", (d) => d.data.categoryColor)
      .attr("stroke", "var(--background)")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .style("transition", "opacity 0.15s ease")
      .on("mouseenter", function (event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr("d", hoverArc(d) as string);

        tooltip
          .style("opacity", 1)
          .html(
            `<strong>${d.data.categoryName}</strong><br/>${formatCurrency(d.data.total)}`
          );
      })
      .on("mousemove", function (event) {
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px");
      })
      .on("mouseleave", function (event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr("d", arc(d) as string);
        tooltip.style("opacity", 0);
      })
      .on("click", function (event, d) {
        if (onCategoryClick) onCategoryClick(d.data.categoryId);
      });

    // Center text
    const total = expenses.reduce((sum, d) => sum + d.total, 0);
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.2em")
      .attr("class", "text-2xl font-semibold")
      .style("fill", "var(--foreground)")
      .text(formatCurrency(total));

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "1.2em")
      .attr("class", "text-xs")
      .style("fill", "var(--muted-foreground)")
      .text("total spent");

    // Tooltip
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "spending-tooltip")
      .style("position", "absolute")
      .style("background", "var(--background)")
      .style("border", "1px solid var(--border)")
      .style("border-radius", "6px")
      .style("padding", "8px 12px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("z-index", 1000)
      .style("box-shadow", "0 4px 12px rgba(0,0,0,0.15)");

    return () => {
      tooltip.remove();
    };
  }, [data, width, height, onCategoryClick]);

  if (!data || data.filter((d) => d.isExpense && d.total > 0).length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        No spending data
      </div>
    );
  }

  return <svg ref={svgRef} width={width} height={height} />;
}

interface SpendingBarChartProps {
  data: CategoryData[];
  onCategoryClick?: (categoryId: string | number | null) => void;
}

export function SpendingBarChart({ data, onCategoryClick }: SpendingBarChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !data || data.length === 0) return;

    const expenses = data
      .filter((d) => d.isExpense && d.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    if (expenses.length === 0) return;

    const containerWidth = containerRef.current.clientWidth;
    const width = containerWidth;
    const height = expenses.length * 44;
    const margin = { top: 0, right: 60, bottom: 0, left: 100 };

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("width", width).attr("height", height);

    const maxValue = d3.max(expenses, (d) => d.total) || 0;

    const xScale = d3
      .scaleLinear()
      .domain([0, maxValue])
      .range([0, width - margin.left - margin.right]);

    const yScale = d3
      .scaleBand()
      .domain(expenses.map((d) => d.categoryName || "Uncategorized"))
      .range([0, height])
      .padding(0.3);

    const g = svg.append("g").attr("transform", `translate(${margin.left}, 0)`);

    // Bars (clickable)
    g.selectAll("rect")
      .data(expenses)
      .enter()
      .append("rect")
      .attr("x", 0)
      .attr("y", (d) => yScale(d.categoryName || "Uncategorized")!)
      .attr("width", (d) => xScale(d.total))
      .attr("height", yScale.bandwidth())
      .attr("fill", (d) => d.categoryColor || "#888")
      .attr("rx", 4)
      .style("cursor", onCategoryClick ? "pointer" : "default")
      .on("click", (event, d) => {
        if (onCategoryClick) onCategoryClick(d.categoryId);
      });

    // Labels (clickable)
    g.selectAll(".label")
      .data(expenses)
      .enter()
      .append("text")
      .attr("x", -8)
      .attr("y", (d) => yScale(d.categoryName || "Uncategorized")! + yScale.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      .attr("class", "text-xs")
      .style("fill", "var(--foreground)")
      .style("cursor", onCategoryClick ? "pointer" : "default")
      .text((d) => d.categoryName || "Uncategorized")
      .on("click", (event, d) => {
        if (onCategoryClick) onCategoryClick(d.categoryId);
      });

    // Values
    g.selectAll(".value")
      .data(expenses)
      .enter()
      .append("text")
      .attr("x", (d) => xScale(d.total) + 8)
      .attr("y", (d) => yScale(d.categoryName || "Uncategorized")! + yScale.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("class", "text-xs tabular-nums")
      .style("fill", "var(--muted-foreground)")
      .text((d) => formatCurrency(d.total));
  }, [data, onCategoryClick]);

  if (!data || data.filter((d) => d.isExpense && d.total > 0).length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[264px] text-muted-foreground text-sm">
        No category data
      </div>
    );
  }

  const expenses = data.filter((d) => d.isExpense && d.total > 0).slice(0, 6);

  return (
    <div ref={containerRef} className="w-full min-h-[264px]">
      <svg ref={svgRef} className="w-full" height={expenses.length * 44} />
    </div>
  );
}
